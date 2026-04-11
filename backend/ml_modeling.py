from __future__ import annotations

import json
import math
import os
import itertools
from collections import defaultdict
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Sequence, Tuple

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    ndcg_score,
)
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, GridSearchCV, RandomizedSearchCV
from sklearn.pipeline import Pipeline

try:
    from xgboost import XGBRegressor
except ImportError:  # pragma: no cover - optional dependency
    XGBRegressor = None

try:
    from lightgbm import LGBMRanker
except ImportError:  # pragma: no cover - optional dependency
    LGBMRanker = None

from ml_data_pipeline import AVREDatasetPipeline


@dataclass(frozen=True)
class ModelSpec:
    name: str
    estimator: Any
    param_grid: Dict[str, Sequence[Any]]
    search_type: str = "grid"
    n_iter: int = 12


@dataclass(frozen=True)
class RegressionMetrics:
    mae: float
    rmse: float
    r2: float


@dataclass(frozen=True)
class RankingMetrics:
    ndcg_at_3: float
    map_at_3: float
    precision_at_1: float


@dataclass(frozen=True)
class SplitSummary:
    train_groups: int
    validation_groups: int
    test_groups: int
    train_rows: int
    validation_rows: int
    test_rows: int


@dataclass(frozen=True)
class ModelBenchmarkResult:
    model_name: str
    best_params: Dict[str, Any]
    validation_regression: RegressionMetrics
    validation_ranking: RankingMetrics
    test_regression: RegressionMetrics
    test_ranking: RankingMetrics


@dataclass(frozen=True)
class RankerSearchResult:
    best_params: Dict[str, Any]
    best_score: float
    best_model: Any


class AVREModelBenchmark:
    """Train, validate, and compare AVRE scoring models.

    Implements the roadmap up through model selection, metrics, and feature
    importance. It uses group-aware splitting so all rows from one request stay
    in the same fold.
    """

    def __init__(self, seed: int = 42) -> None:
        self.seed = seed
        self.pipeline = AVREDatasetPipeline(seed=seed)
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.artifacts_dir = os.path.join(self.base_dir, "ml_artifacts")
        os.makedirs(self.artifacts_dir, exist_ok=True)
        self.last_report: Optional[Dict[str, Any]] = None

    @staticmethod
    def _safe_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
        return float(math.sqrt(mean_squared_error(y_true, y_pred)))

    @staticmethod
    def _ensure_series(values: Any) -> pd.Series:
        if isinstance(values, pd.Series):
            return values.reset_index(drop=True)
        return pd.Series(values)

    def prepare_frame(self, dataset: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
        engineered = self.pipeline.engineer_features(dataset)
        target = engineered["match_score"].astype(float).reset_index(drop=True)
        groups = engineered["request_id"].astype(int).reset_index(drop=True)

        feature_frame = engineered.drop(
            columns=[
                "match_score",
                "request_id",
                "vendor_id",
                "stock_quantity",
                "required_quantity",
                "resource_category",
                "vendor_category",
                "category_match",
                "price",
                "active_status",
                "past_success_rate",
                "delivery_capacity",
                "hour_of_day",
                "day_of_week",
                "is_sufficient_stock",
                "distance_score",
                "speed_score",
            ],
            errors="ignore",
        ).reset_index(drop=True)
        return feature_frame, target, groups

    def split_by_request_groups(
        self,
        feature_frame: pd.DataFrame,
        target: pd.Series,
        groups: pd.Series,
        train_ratio: float = 0.70,
        validation_ratio: float = 0.15,
        test_ratio: float = 0.15,
    ) -> Dict[str, Any]:
        if not math.isclose(train_ratio + validation_ratio + test_ratio, 1.0, rel_tol=1e-6):
            raise ValueError("Split ratios must sum to 1.0")

        group_ids = groups.to_numpy()
        group_shuffle = GroupShuffleSplit(n_splits=1, train_size=train_ratio, random_state=self.seed)
        train_index, remaining_index = next(group_shuffle.split(feature_frame, target, group_ids))

        remaining_groups = group_ids[remaining_index]
        remaining_features = feature_frame.iloc[remaining_index].reset_index(drop=True)
        remaining_target = target.iloc[remaining_index].reset_index(drop=True)

        remaining_ratio = validation_ratio + test_ratio
        validation_share = validation_ratio / remaining_ratio
        second_shuffle = GroupShuffleSplit(n_splits=1, train_size=validation_share, random_state=self.seed + 1)
        validation_relative_index, test_relative_index = next(
            second_shuffle.split(remaining_features, remaining_target, remaining_groups)
        )

        train_split = {
            "features": feature_frame.iloc[train_index].reset_index(drop=True),
            "target": target.iloc[train_index].reset_index(drop=True),
            "groups": groups.iloc[train_index].reset_index(drop=True),
        }
        validation_split = {
            "features": remaining_features.iloc[validation_relative_index].reset_index(drop=True),
            "target": remaining_target.iloc[validation_relative_index].reset_index(drop=True),
            "groups": pd.Series(remaining_groups[validation_relative_index]).reset_index(drop=True),
        }
        test_split = {
            "features": remaining_features.iloc[test_relative_index].reset_index(drop=True),
            "target": remaining_target.iloc[test_relative_index].reset_index(drop=True),
            "groups": pd.Series(remaining_groups[test_relative_index]).reset_index(drop=True),
        }

        summary = SplitSummary(
            train_groups=int(train_split["groups"].nunique()),
            validation_groups=int(validation_split["groups"].nunique()),
            test_groups=int(test_split["groups"].nunique()),
            train_rows=int(train_split["features"].shape[0]),
            validation_rows=int(validation_split["features"].shape[0]),
            test_rows=int(test_split["features"].shape[0]),
        )

        return {
            "train": train_split,
            "validation": validation_split,
            "test": test_split,
            "summary": summary,
        }

    @staticmethod
    def regression_metrics(y_true: Sequence[float], y_pred: Sequence[float]) -> RegressionMetrics:
        y_true_array = np.asarray(y_true, dtype=float)
        y_pred_array = np.asarray(y_pred, dtype=float)
        return RegressionMetrics(
            mae=float(mean_absolute_error(y_true_array, y_pred_array)),
            rmse=float(math.sqrt(mean_squared_error(y_true_array, y_pred_array))),
            r2=float(r2_score(y_true_array, y_pred_array)),
        )

    @staticmethod
    def _average_precision_at_k(relevant_positions: List[int], k: int = 3) -> float:
        if not relevant_positions:
            return 0.0

        hits = 0
        precision_sum = 0.0
        for rank_position in range(1, min(k, len(relevant_positions)) + 1):
            if rank_position in relevant_positions:
                hits += 1
                precision_sum += hits / rank_position
        return precision_sum / max(min(k, len(relevant_positions)), 1)

    def ranking_metrics(
        self,
        y_true: Sequence[float],
        y_pred: Sequence[float],
        groups: Sequence[int],
        k: int = 3,
    ) -> RankingMetrics:
        y_true_array = np.asarray(y_true, dtype=float)
        y_pred_array = np.asarray(y_pred, dtype=float)
        group_array = np.asarray(groups)

        ndcg_scores: List[float] = []
        map_scores: List[float] = []
        precision_scores: List[float] = []

        for group_id in np.unique(group_array):
            group_mask = group_array == group_id
            group_true = y_true_array[group_mask]
            group_pred = y_pred_array[group_mask]
            if len(group_true) < 1:
                continue

            if len(group_true) == 1:
                ndcg_scores.append(1.0)
                map_scores.append(1.0)
                precision_scores.append(1.0)
                continue

            ndcg_scores.append(float(ndcg_score(group_true.reshape(1, -1), group_pred.reshape(1, -1), k=k)))

            true_order = np.argsort(-group_true)
            top_true_indices = set(true_order[: min(k, len(true_order))].tolist())
            pred_order = np.argsort(-group_pred)

            relevant_positions: List[int] = []
            for predicted_rank, candidate_index in enumerate(pred_order[:k], start=1):
                if candidate_index in top_true_indices:
                    relevant_positions.append(predicted_rank)

            map_scores.append(self._average_precision_at_k(relevant_positions, k=k))
            precision_scores.append(1.0 if pred_order[0] in top_true_indices else 0.0)

        return RankingMetrics(
            ndcg_at_3=float(np.mean(ndcg_scores)) if ndcg_scores else 0.0,
            map_at_3=float(np.mean(map_scores)) if map_scores else 0.0,
            precision_at_1=float(np.mean(precision_scores)) if precision_scores else 0.0,
        )

    def model_specs(self) -> List[ModelSpec]:
        specs: List[ModelSpec] = [
            ModelSpec(
                name="RandomForestRegressor",
                estimator=RandomForestRegressor(random_state=self.seed, n_jobs=-1),
                param_grid={
                    "n_estimators": [150, 250],
                    "max_depth": [None, 12],
                    "min_samples_split": [2, 5],
                    "min_samples_leaf": [1, 2],
                },
                search_type="random",
                n_iter=6,
            ),
            ModelSpec(
                name="GradientBoostingRegressor",
                estimator=GradientBoostingRegressor(random_state=self.seed),
                param_grid={
                    "n_estimators": [100, 200],
                    "learning_rate": [0.05, 0.1],
                    "max_depth": [3, 4],
                    "subsample": [0.8, 1.0],
                },
                search_type="random",
                n_iter=6,
            ),
        ]

        if XGBRegressor is not None:
            specs.append(
                ModelSpec(
                    name="XGBoostRegressor",
                    estimator=XGBRegressor(
                        random_state=self.seed,
                        objective="reg:squarederror",
                        tree_method="hist",
                        n_jobs=-1,
                    ),
                    param_grid={
                        "n_estimators": [100, 200],
                        "max_depth": [4, 6, 8],
                        "learning_rate": [0.01, 0.05, 0.1],
                        "subsample": [0.8, 1.0],
                        "colsample_bytree": [0.8, 1.0],
                    },
                    search_type="random",
                    n_iter=8,
                )
            )

        if LGBMRanker is not None:
            specs.append(
                ModelSpec(
                    name="LightGBMRanker",
                    estimator=LGBMRanker(
                        random_state=self.seed,
                        objective="lambdarank",
                        metric="ndcg",
                        n_jobs=-1,
                        verbosity=-1,
                        feature_pre_filter=False,
                        min_data_in_leaf=1,
                        min_data_in_bin=1,
                    ),
                    param_grid={
                        "n_estimators": [100, 200],
                        "learning_rate": [0.03, 0.05, 0.1],
                        "num_leaves": [15, 31, 63],
                        "max_depth": [-1, 6, 8],
                        "subsample": [0.8, 1.0],
                        "colsample_bytree": [0.8, 1.0],
                    },
                    search_type="ranker",
                    n_iter=8,
                )
            )

        return specs

    def _build_pipeline(self, feature_frame: pd.DataFrame, estimator: Any) -> Pipeline:
        preprocessor = self.pipeline.build_preprocessor(feature_frame)
        return Pipeline(
            steps=[
                ("preprocess", preprocessor),
                ("model", estimator),
            ]
        )

    def _build_search(
        self,
        pipeline: Pipeline,
        spec: ModelSpec,
        cv: GroupKFold,
        random_state: int,
    ) -> Any:
        param_grid = {f"model__{key}": value for key, value in spec.param_grid.items()}
        scoring = "neg_root_mean_squared_error"
        total_combinations = int(np.prod([len(values) for values in spec.param_grid.values()]))

        if spec.search_type == "random":
            return RandomizedSearchCV(
                estimator=pipeline,
                param_distributions=param_grid,
            n_iter=min(spec.n_iter, max(1, total_combinations)),
                scoring=scoring,
                cv=cv,
                random_state=random_state,
                n_jobs=-1,
                refit=True,
            )

        return GridSearchCV(
            estimator=pipeline,
            param_grid=param_grid,
            scoring=scoring,
            cv=cv,
            n_jobs=-1,
            refit=True,
        )

    @staticmethod
    def _group_sizes(group_values: Sequence[int]) -> List[int]:
        sizes: List[int] = []
        current_group = None
        current_size = 0

        for group_value in group_values:
            if current_group is None:
                current_group = group_value
                current_size = 1
                continue

            if group_value == current_group:
                current_size += 1
                continue

            sizes.append(current_size)
            current_group = group_value
            current_size = 1

        if current_size:
            sizes.append(current_size)

        return sizes

    def _ranker_parameter_candidates(self, spec: ModelSpec) -> List[Dict[str, Any]]:
        keys = list(spec.param_grid.keys())
        values = [list(spec.param_grid[key]) for key in keys]
        combinations = [dict(zip(keys, combination)) for combination in itertools.product(*values)]
        self.rng = np.random.default_rng(self.seed)
        self.rng.shuffle(combinations)
        return combinations[: min(spec.n_iter, len(combinations))]

    @staticmethod
    def _ranker_relevance_labels(target: Sequence[float]) -> np.ndarray:
        target_array = np.asarray(target, dtype=float)
        relevance = np.rint(target_array / 20.0)
        return np.clip(relevance, 0, 5).astype(int)

    def _fit_lightgbm_ranker(
        self,
        spec: ModelSpec,
        train_features: pd.DataFrame,
        train_target: pd.Series,
        train_groups: pd.Series,
        validation_features: pd.DataFrame,
        validation_target: pd.Series,
        validation_groups: pd.Series,
    ) -> RankerSearchResult:
        if LGBMRanker is None:
            raise RuntimeError("lightgbm is not installed")

        train_frame = train_features.copy()
        train_frame["__group__"] = train_groups.to_numpy()
        train_frame["__target__"] = train_target.to_numpy()
        train_frame = train_frame.sort_values(["__group__"]).reset_index(drop=True)

        validation_frame = validation_features.copy()
        validation_frame["__group__"] = validation_groups.to_numpy()
        validation_frame["__target__"] = validation_target.to_numpy()
        validation_frame = validation_frame.sort_values(["__group__"]).reset_index(drop=True)

        x_train = train_frame.drop(columns=["__group__", "__target__"])
        y_train = self._ranker_relevance_labels(train_frame["__target__"])
        train_group_sizes = self._group_sizes(train_frame["__group__"].tolist())

        x_validation = validation_frame.drop(columns=["__group__", "__target__"])
        y_validation = validation_frame["__target__"]
        validation_group_sizes = self._group_sizes(validation_frame["__group__"].tolist())

        best_score = float("-inf")
        best_params: Dict[str, Any] = {}
        best_model: Any = None

        for params in self._ranker_parameter_candidates(spec):
            model = LGBMRanker(
                random_state=self.seed,
                objective="lambdarank",
                metric="ndcg",
                    n_jobs=-1,
                    verbosity=-1,
                    feature_pre_filter=False,
                    min_data_in_leaf=1,
                    min_data_in_bin=1,
                **params,
            )
            model.fit(x_train, y_train, group=train_group_sizes)
            validation_predictions = model.predict(x_validation)
            score = float(ndcg_score(np.asarray(y_validation).reshape(1, -1), np.asarray(validation_predictions).reshape(1, -1), k=3))
            if score > best_score:
                best_score = score
                best_params = params
                best_model = model

        if best_model is None:
            best_model = LGBMRanker(random_state=self.seed, objective="lambdarank", metric="ndcg", n_jobs=-1)
            best_model.fit(x_train, y_train, group=train_group_sizes)
            best_score = 0.0

        return RankerSearchResult(best_params=best_params, best_score=best_score, best_model=best_model)

    def _feature_importance_from_pipeline(
        self,
        fitted_pipeline: Pipeline,
        feature_frame: pd.DataFrame,
    ) -> List[Dict[str, float]]:
        preprocessor = fitted_pipeline.named_steps["preprocess"]
        model = fitted_pipeline.named_steps["model"]
        feature_names = list(preprocessor.get_feature_names_out())

        raw_importances = getattr(model, "feature_importances_", None)
        if raw_importances is None:
            return []

        importance_by_feature: Dict[str, float] = defaultdict(float)
        categorical_prefixes = ["resource_category", "vendor_category"]

        for feature_name, importance in zip(feature_names, raw_importances):
            key = feature_name
            for prefix in categorical_prefixes:
                if feature_name == prefix or feature_name.startswith(f"{prefix}_"):
                    key = prefix
                    break
            importance_by_feature[key] += float(importance)

        sorted_importance = sorted(
            (
                {"feature": name, "importance": round(score, 6)}
                for name, score in importance_by_feature.items()
            ),
            key=lambda item: item["importance"],
            reverse=True,
        )
        return sorted_importance

    def _save_feature_importance_chart(self, importance_data: List[Dict[str, float]]) -> str:
        chart_path = os.path.join(self.artifacts_dir, "feature_importance.png")
        top_features = importance_data[:15]

        if not top_features:
            return chart_path

        labels = [item["feature"] for item in top_features][::-1]
        values = [item["importance"] for item in top_features][::-1]

        plt.figure(figsize=(10, 6))
        plt.barh(labels, values, color="#2563eb")
        plt.title("AVRE Feature Importance")
        plt.xlabel("Importance")
        plt.tight_layout()
        plt.savefig(chart_path, dpi=160)
        plt.close()
        return chart_path

    def benchmark_holdout(
        self,
        dataset: pd.DataFrame,
        validation_rows: int = 0,
    ) -> Dict[str, Any]:
        feature_frame, target, groups = self.prepare_frame(dataset)
        splits = self.split_by_request_groups(feature_frame, target, groups)
        train_split = splits["train"]
        validation_split = splits["validation"]
        test_split = splits["test"]
        split_summary: SplitSummary = splits["summary"]

        unique_train_groups = int(train_split["groups"].nunique())
        cv_folds = max(2, min(3, unique_train_groups))
        group_kfold = GroupKFold(n_splits=cv_folds)

        model_reports: List[ModelBenchmarkResult] = []
        validation_rank = []

        for spec in self.model_specs():
            if spec.search_type == "ranker":
                ranker_search = self._fit_lightgbm_ranker(
                    spec=spec,
                    train_features=train_split["features"],
                    train_target=train_split["target"],
                    train_groups=train_split["groups"],
                    validation_features=validation_split["features"],
                    validation_target=validation_split["target"],
                    validation_groups=validation_split["groups"],
                )

                validation_predictions = ranker_search.best_model.predict(validation_split["features"])
                validation_report = ModelBenchmarkResult(
                    model_name=spec.name,
                    best_params=ranker_search.best_params,
                    validation_regression=self.regression_metrics(validation_split["target"], validation_predictions),
                    validation_ranking=self.ranking_metrics(validation_split["target"], validation_predictions, validation_split["groups"]),
                    test_regression=RegressionMetrics(0.0, 0.0, 0.0),
                    test_ranking=RankingMetrics(0.0, 0.0, 0.0),
                )
                model_reports.append(validation_report)
                validation_rank.append(
                    (
                        validation_report.validation_ranking.ndcg_at_3,
                        validation_report.validation_ranking.precision_at_1,
                        -validation_report.validation_regression.rmse,
                        spec,
                        ranker_search.best_params,
                        ranker_search.best_model,
                    )
                )
                continue

            pipeline = self._build_pipeline(train_split["features"], spec.estimator)
            search = self._build_search(pipeline, spec, group_kfold, self.seed)
            search.fit(train_split["features"], train_split["target"], groups=train_split["groups"])

            validation_predictions = search.predict(validation_split["features"])

            validation_report = ModelBenchmarkResult(
                model_name=spec.name,
                best_params={key.replace("model__", ""): value for key, value in search.best_params_.items()},
                validation_regression=self.regression_metrics(validation_split["target"], validation_predictions),
                validation_ranking=self.ranking_metrics(validation_split["target"], validation_predictions, validation_split["groups"]),
                test_regression=RegressionMetrics(0.0, 0.0, 0.0),
                test_ranking=RankingMetrics(0.0, 0.0, 0.0),
            )
            model_reports.append(validation_report)
            validation_rank.append(
                (
                    validation_report.validation_ranking.ndcg_at_3,
                    validation_report.validation_ranking.precision_at_1,
                    -validation_report.validation_regression.rmse,
                    spec,
                    search.best_params_,
                    search,
                )
            )

        validation_rank.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)
        best_ndcg, _, _, best_spec, best_params, best_model_object = validation_rank[0]

        combined_features = pd.concat([train_split["features"], validation_split["features"]], ignore_index=True)
        combined_target = pd.concat([train_split["target"], validation_split["target"]], ignore_index=True)
        combined_groups = pd.concat([train_split["groups"], validation_split["groups"]], ignore_index=True)

        if best_spec.search_type == "ranker":
            combined_frame = pd.concat([combined_features, combined_target.rename("__target__"), combined_groups.rename("__group__")], axis=1)
            combined_frame = combined_frame.sort_values(["__group__"]).reset_index(drop=True)
            combined_x = combined_frame.drop(columns=["__target__", "__group__"])
            combined_y = self._ranker_relevance_labels(combined_frame["__target__"])
            combined_group_sizes = self._group_sizes(combined_frame["__group__"].tolist())
            best_model_object = LGBMRanker(
                random_state=self.seed,
                objective="lambdarank",
                metric="ndcg",
                    n_jobs=-1,
                    verbosity=-1,
                    feature_pre_filter=False,
                    min_data_in_leaf=1,
                    min_data_in_bin=1,
                **best_params,
            )
            best_model_object.fit(combined_x, combined_y, group=combined_group_sizes)
            test_predictions = best_model_object.predict(test_split["features"])
        else:
            best_pipeline = self._build_pipeline(combined_features, best_spec.estimator)
            best_pipeline.set_params(**best_params)
            best_pipeline.fit(combined_features, combined_target)
            test_predictions = best_pipeline.predict(test_split["features"])
            best_model_object = best_pipeline
        test_regression = self.regression_metrics(test_split["target"], test_predictions)
        test_ranking = self.ranking_metrics(test_split["target"], test_predictions, test_split["groups"])
        if best_spec.search_type == "ranker":
            feature_names = list(combined_features.columns)
            raw_importances = getattr(best_model_object, "feature_importances_", None)
            if raw_importances is None:
                importance_data = []
            else:
                importance_data = [
                    {"feature": name, "importance": round(float(score), 6)}
                    for name, score in sorted(zip(feature_names, raw_importances), key=lambda item: item[1], reverse=True)
                ]
        else:
            importance_data = self._feature_importance_from_pipeline(best_model_object, combined_features)
        chart_path = self._save_feature_importance_chart(importance_data)

        final_reports: List[Dict[str, Any]] = []
        for report in model_reports:
            final_reports.append(
                {
                    "model_name": report.model_name,
                    "best_params": report.best_params,
                    "validation_regression": asdict(report.validation_regression),
                    "validation_ranking": asdict(report.validation_ranking),
                }
            )

        summary = {
            "split_strategy": "holdout",
            "split_summary": asdict(split_summary),
            "model_reports": final_reports,
            "selected_model": best_spec.name,
            "selected_model_best_params": {key.replace("model__", ""): value for key, value in best_params.items()},
            "validation_winner_ndcg_at_3": round(best_ndcg, 6),
            "test_regression": asdict(test_regression),
            "test_ranking": asdict(test_ranking),
            "feature_importance": importance_data,
            "feature_importance_chart_path": chart_path,
        }

        self.last_report = summary
        self._save_report(summary)
        return summary

    def benchmark_cross_validation(
        self,
        dataset: pd.DataFrame,
        cv_folds: int = 5,
    ) -> Dict[str, Any]:
        feature_frame, target, groups = self.prepare_frame(dataset)
        group_kfold = GroupKFold(n_splits=max(2, min(cv_folds, int(groups.nunique()))))

        fold_reports: List[Dict[str, Any]] = []

        for spec in self.model_specs():
            if spec.search_type == "ranker":
                manual_splits = list(group_kfold.split(feature_frame, target, groups))
                rank_scores: List[float] = []
                best_score = float("-inf")
                best_params: Dict[str, Any] = {}

                for params in self._ranker_parameter_candidates(spec):
                    fold_scores: List[float] = []
                    for train_index, validation_index in manual_splits:
                        fold_result = self._fit_lightgbm_ranker(
                            spec=ModelSpec(name=spec.name, estimator=spec.estimator, param_grid={**spec.param_grid, **params}, search_type=spec.search_type, n_iter=spec.n_iter),
                            train_features=feature_frame.iloc[train_index].reset_index(drop=True),
                            train_target=target.iloc[train_index].reset_index(drop=True),
                            train_groups=groups.iloc[train_index].reset_index(drop=True),
                            validation_features=feature_frame.iloc[validation_index].reset_index(drop=True),
                            validation_target=target.iloc[validation_index].reset_index(drop=True),
                            validation_groups=groups.iloc[validation_index].reset_index(drop=True),
                        )
                        fold_scores.append(fold_result.best_score)
                    mean_score = float(np.mean(fold_scores)) if fold_scores else 0.0
                    if mean_score > best_score:
                        best_score = mean_score
                        best_params = params
                    rank_scores.append(mean_score)

                fold_reports.append(
                    {
                        "model_name": spec.name,
                        "best_params": best_params,
                        "best_cv_score": best_score,
                        "mean_test_rmse": float(1.0 - best_score),
                        "cv_rows": int(len(rank_scores)),
                    }
                )
                continue

            pipeline = self._build_pipeline(feature_frame, spec.estimator)
            search = self._build_search(pipeline, spec, group_kfold, self.seed)
            search.fit(feature_frame, target, groups=groups)

            cv_results = pd.DataFrame(search.cv_results_)
            fold_reports.append(
                {
                    "model_name": spec.name,
                    "best_params": {key.replace("model__", ""): value for key, value in search.best_params_.items()},
                    "best_cv_score": float(search.best_score_),
                    "mean_test_rmse": float(abs(search.best_score_)),
                    "cv_rows": int(cv_results.shape[0]),
                }
            )

        summary = {
            "split_strategy": "cross_validation",
            "cv_folds": int(group_kfold.get_n_splits()),
            "model_reports": fold_reports,
        }

        self.last_report = summary
        self._save_report(summary)
        return summary

    def benchmark(
        self,
        rows: int = 5000,
        vendors: int = 100,
        requests: int = 500,
        strategy: str = "holdout",
        cv_folds: int = 5,
        seed: Optional[int] = None,
    ) -> Dict[str, Any]:
        if seed is not None:
            self.pipeline = AVREDatasetPipeline(seed=seed)

        dataset = self.pipeline.generate_synthetic_dataset(
            num_rows=rows,
            num_vendors=vendors,
            num_requests=requests,
        )

        if strategy == "cross_validation":
            return self.benchmark_cross_validation(dataset, cv_folds=cv_folds)

        return self.benchmark_holdout(dataset)

    def _save_report(self, report: Dict[str, Any]) -> None:
        report_path = os.path.join(self.artifacts_dir, "benchmark_report.json")
        with open(report_path, "w", encoding="utf-8") as report_file:
            json.dump(report, report_file, indent=2)

    def last_feature_importance(self) -> Dict[str, Any]:
        if not self.last_report:
            return {
                "available": False,
                "message": "No benchmark has been run yet.",
            }

        return {
            "available": True,
            "selected_model": self.last_report.get("selected_model"),
            "feature_importance": self.last_report.get("feature_importance", []),
            "feature_importance_chart_path": self.last_report.get("feature_importance_chart_path"),
        }


benchmark_service = AVREModelBenchmark()
