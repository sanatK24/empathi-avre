# AVRE Retraining Strategy

## 1. Data Collection Signals
The model should be retrained using feedback loops from the following signals:

- **Selection Signal:** Which vendor among the top-ranked candidates did the user actually select? (`selected_flag` updates)
- **Outcome Signal:** Did the vendor actually fulfill the request? (`MatchStatus.COMPLETED`)
- **Latency Signal:** How many minutes did the vendor actually take to respond? (`response_time` vs `avg_response_time`)
- **Requester Feedback:** Rating given by the requester to the vendor after fulfillment.
- **Rejection Signal:** Why did a vendor reject a match? (Stock mismatch, distance, etc.)

## 2. Triggering Continuous Training
We recommend the following triggers for retraining the AVRE model:

- **Schedule-based:** Every Sunday at 02:00 AM (to handle shifts in vendor behavior/stock patterns).
- **Volume-based:** Every 1,000 new successful matches.
- **Performance-based:** If the Top-1 Precision (online) drops below 0.65 for more than 48 hours.

## 3. Validation Logic (Staging)
Before promoting a new model to production:

1. **Shadow Testing:** Run the new model in "shadow mode" (log results but don't use them for ranking) for 24 hours.
2. **Offline Benchmarking:** New model NDCG@3 must be >= (Old Model NDCG@3 - 0.02).
3. **Latency Check:** Inference time for batch (10 vendors) must be <= 50ms.

## 4. Rollback Strategy
- Keep the last 3 versions of `model.pkl` (e.g., `model_v20260413.pkl`).
- A simple environment variable `ML_MODEL_VERSION` can toggle the active file in `AVREEngine`.

## 5. Cold-Start Handling
For new vendors with no history:
- Default `reliability_score` = 0.8
- Default `avg_response_time` = (City-wide average)
- Model will naturally rank them reasonably due to proximity and stock features.
