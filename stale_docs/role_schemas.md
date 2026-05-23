# EmpathI Manual User Data Entry Schema Reference

This document provides a comprehensive, field-by-field reference of all schemas in the **EmpathI** application that are manually entered/submitted by users. The schemas are categorized by their target user roles: **General (All Users)**, **Requesters**, **Vendors**, and **Administrators**.

Each schema section includes:
* **Pydantic Model Name** and description.
* **Field-by-Field Breakdown** including types, requirements, constraints, and validation logic.
* **Realistic JSON Examples** representing typical payload requests.

---

## 📋 Table of Contents
1. [General schemas (All Roles)](#1-general-schemas-all-roles)
   - [User Registration (UserCreate)](#user-registration-usercreate)
   - [User Profile Update (UserUpdate)](#user-profile-update-userupdate)
   - [User Emergency Contact Setup (UserEmergencyContactBase)](#user-emergency-contact-setup-useremergencycontactbase)
2. [🙋 Requester Role Schemas](#2-requester-role-schemas)
   - [Resource Request Creation (RequestCreate)](#resource-request-creation-requestcreate)
   - [Crowdfunding Campaign Creation (CampaignCreate)](#crowdfunding-campaign-creation-campaigncreate)
   - [Crowdfunding Campaign Update (CampaignUpdate)](#crowdfunding-campaign-update-campaignupdate)
   - [Campaign Update Announcement (CampaignUpdateCreate)](#campaign-update-announcement-campaignupdatecreate)
   - [Campaign Update Commenting (UpdateCommentCreate)](#campaign-update-commenting-updatecommentcreate)
   - [Donation & Payment Processing (PaymentProcess)](#donation--payment-processing-paymentprocess)
3. [🏪 Vendor Role Schemas](#3-vendor-role-schemas)
   - [Vendor Profile Setup (VendorProfileCreate)](#vendor-profile-setup-vendorprofilecreate)
   - [Inventory Resource Creation (InventoryCreate)](#inventory-resource-creation-inventorycreate)
   - [Inventory Resource Update (InventoryUpdate)](#inventory-resource-update-inventoryupdate)
4. [🛠️ Administrator Role Schemas](#4-administrator-role-schemas)
   - [Scoring Weights Configuration (ScoringWeightsUpdate)](#scoring-weights-configuration-scoringweightsupdate)
   - [Campaign Verification Status (CampaignVerifyRequest)](#campaign-verification-status-campaignverifyrequest)
   - [Campaign Status Administrative Override (CampaignStatusUpdate)](#campaign-status-administrative-override-campaignstatusupdate)

---

## 1. General Schemas (All Roles)

These schemas apply to all users during onboarding, account registration, profile management, and setting up personal emergency details.

### User Registration (UserCreate)
Used by any new user signing up to the EmpathI platform.

* **Pydantic Class:** `UserCreate` (inherits from `UserBase`)
* **Database Target:** `users` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | - | Full name of the user. |
| `email` | `string` | **Yes** | Valid Email format | Unique email address used for login. |
| `password` | `string` | **Yes** | - | Plaintext password (hashed before database insertion). |
| `role` | `string` | No | Default: `"REQUESTER"`<br>Must be: `"REQUESTER"`, `"VENDOR"`, or `"ADMIN"` | Case-insensitive role assignment. |
| `phone` | `string` | No | - | Contact phone number. |
| `city` | `string` | No | - | User's operational city. |
| `organization_name`| `string` | No | - | Name of associated organization (mainly for Vendors/NGOs). |
| `bio` | `string` | No | - | Short professional or personal description. |
| `avatar_url` | `string` | No | URL | URL of the profile picture. |
| `blood_group` | `string` | No | - | Blood group (e.g., `"A+"`, `"O-"`) for emergency matching. |
| `emergency_contact_name` | `string` | No | - | Primary emergency contact person's name. |
| `emergency_contact_phone` | `string` | No | - | Primary emergency contact person's phone number. |
| `preferred_hospital` | `string` | No | - | Preferred medical facility in case of emergency. |
| `saved_addresses` | `string` | No | Comma-separated or JSON | Saved address configurations. |
| `accessibility_needs` | `string` | No | - | Medical or physical accessibility requirements. |
| `personal_categories` | `string` | No | Comma-separated list | Custom user categorization tags. |

> [!NOTE]
> The `role` field validator automatically converts input values to uppercase (e.g. `"vendor"` becomes `"VENDOR"`).

#### JSON Example
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@empathi.org",
  "password": "SecurePassword123!",
  "role": "requester",
  "phone": "+15550199",
  "city": "Mumbai",
  "organization_name": "Helping Hands Foundation",
  "bio": "Community organizer focusing on emergency medical logistics.",
  "blood_group": "O-",
  "emergency_contact_name": "John Doe",
  "emergency_contact_phone": "+15550198",
  "preferred_hospital": "City General Hospital",
  "saved_addresses": "123 Hope Street, Sector 4, Mumbai",
  "accessibility_needs": "Wheelchair ramp access preferred",
  "personal_categories": "ngo,medical_volunteer"
}
```

---

### User Profile Update (UserUpdate)
Used by authenticated users to update their profile information.

* **Pydantic Class:** `UserUpdate`
* **Database Target:** `users` table

#### Field Reference
All fields in this schema are **optional**. Only fields provided in the payload will be updated.

| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | No | - | Updated full name. |
| `email` | `string` | No | Valid Email format | Updated email address. |
| `phone` | `string` | No | - | Updated phone number. |
| `city` | `string` | No | - | Updated city. |
| `organization_name`| `string` | No | - | Updated organization name. |
| `bio` | `string` | No | - | Updated bio. |
| `password` | `string` | No | - | New plaintext password (will be re-hashed). |
| `blood_group` | `string` | No | - | Updated blood group. |
| `emergency_contact_name` | `string` | No | - | Updated emergency contact name. |
| `emergency_contact_phone` | `string` | No | - | Updated emergency contact phone. |
| `preferred_hospital` | `string` | No | - | Updated preferred hospital. |
| `saved_addresses` | `string` | No | - | Updated saved addresses. |
| `accessibility_needs` | `string` | No | - | Updated accessibility needs. |
| `personal_categories` | `string` | No | - | Updated user tags. |

#### JSON Example
```json
{
  "phone": "+15559876",
  "bio": "Updated bio focusing on active community rescue support.",
  "emergency_contact_phone": "+15551122",
  "saved_addresses": "456 Peace Avenue, Sector 8, Mumbai"
}
```

---

### User Emergency Contact Setup (UserEmergencyContactBase)
Allows users to build an emergency network directory (Family, Doctor, Neighbors, etc.).

* **Pydantic Class:** `UserEmergencyContactBase`
* **Database Target:** `user_emergency_contacts` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | - | Full name of the contact. |
| `phone` | `string` | **Yes** | - | Phone number. |
| `category` | `string` | **Yes** | - | Relationship category (e.g. `"Family"`, `"Doctor"`, `"Neighbor"`). |

#### JSON Example
```json
{
  "name": "Dr. Sarah Alston",
  "phone": "+919876543210",
  "category": "Doctor"
}
```

---

## 2. Requester Role Schemas

Requesters use these schemas to demand emergency medical resources, start fundraising campaigns, post campaign announcements, comment, and issue payments.

### Resource Request Creation (RequestCreate)
Submitted by Requesters in urgent situations to trigger the EmpathI AI Matching Engine.

* **Pydantic Class:** `RequestCreate`
* **Database Target:** `requests` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `resource_name` | `string` | **Yes** | Length: 2 to 100 characters | Name of needed product (e.g. `"Oxygen Cylinder"`). |
| `category` | `string` | **Yes** | Length: 2 to 50 characters | Category (e.g. `"medical"`, `"pharmacy"`, `"grocery"`). |
| `quantity` | `integer` | **Yes** | Minimum value: `1` | Count or number of units needed. |
| `location_lat` | `float` | **Yes** | Value: `-90.0` to `90.0` | Latitude coordinate of the delivery location. |
| `location_lng` | `float` | **Yes** | Value: `-180.0` to `180.0` | Longitude coordinate of the delivery location. |
| `city` | `string` | **Yes** | Length: 2 to 100 characters | Target city. |
| `urgency_level` | `string` | No | Default: `"MEDIUM"`<br>Must be: `"LOW"`, `"MEDIUM"`, `"HIGH"`, or `"CRITICAL"` | Level of emergency urgency. |
| `preferred_eta` | `integer` | No | Minimum value: `1` | Preferred delivery timeline (in minutes). |
| `notes` | `string` | No | Maximum length: 500 characters | General description/context of the request. |
| `special_instructions`| `string`| No | Maximum length: 500 characters | Delivery directions or handoff constraints. |
| `payment_mode` | `string` | No | Default: `"cod"` | Preferred payment model (e.g., `"cod"`, `"online"`, `"donation"`). |

> [!TIP]
> The `urgency_level` is a critical input that directly impacts the matching algorithm score!

#### JSON Example
```json
{
  "resource_name": "Oxygen Concentrator 10L",
  "category": "medical",
  "quantity": 1,
  "location_lat": 19.0760,
  "location_lng": 72.8777,
  "city": "Mumbai",
  "urgency_level": "critical",
  "preferred_eta": 60,
  "notes": "Required urgently for a patient with falling SpO2 levels.",
  "special_instructions": "Deliver to Ward 3A, door code 4455.",
  "payment_mode": "cod"
}
```

---

### Crowdfunding Campaign Creation (CampaignCreate)
Used to start a public fundraising campaign for medical, food, or disaster relief.

* **Pydantic Class:** `CampaignCreate`
* **Database Target:** `campaigns` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | Length: 5 to 200 characters | Descriptive title of the campaign. |
| `description` | `string` | **Yes** | Length: 10 to 5000 characters | Full context, reasons, and story behind the fundraiser. |
| `category` | `string` | **Yes** | Length: 2 to 50 characters | Focus area (e.g., `"medical"`, `"food"`, `"shelter"`). |
| `city` | `string` | **Yes** | Length: 2 to 100 characters | Target city benefiting from the campaign. |
| `goal_amount` | `float` | **Yes** | Greater than `0.0` | Target financial amount in standard currency. |
| `urgency_level` | `string` | No | Default: `"MEDIUM"`<br>Must be: `"LOW"`, `"MEDIUM"`, `"HIGH"`, or `"CRITICAL"` | Severity of deadline/needs. |
| `cover_image` | `string` | No | URL | Thumbnail or header banner image URL. |
| `deadline` | `string` | No | ISO 8601 Datetime string | Expiry timestamp for the campaign. |
| `status` | `string` | No | Default: `"ACTIVE"`<br>Must be: `"ACTIVE"`, `"DRAFT"`, `"COMPLETED"`, `"CANCELLED"` | Initial lifecycle status. |

#### JSON Example
```json
{
  "title": "Emergency Cancer Treatment for Rohan",
  "description": "Rohan requires immediate chemotherapy rounds. All funds will go directly to hospital bills.",
  "category": "medical",
  "city": "Mumbai",
  "goal_amount": 500000.00,
  "urgency_level": "high",
  "cover_image": "https://example.com/images/campaigns/rohan.jpg",
  "deadline": "2026-06-30T23:59:59Z",
  "status": "active"
}
```

---

### Crowdfunding Campaign Update (CampaignUpdate)
Used by campaign creators to edit an existing draft or active campaign details.

* **Pydantic Class:** `CampaignUpdate`
* **Database Target:** `campaigns` table

#### Field Reference
All fields in this schema are **optional**. Only provided fields will be overwritten.

| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | No | Length: 5 to 200 characters | Revised title. |
| `description` | `string` | No | Length: 10 to 5000 characters | Revised description. |
| `category` | `string` | No | - | Revised category. |
| `city` | `string` | No | - | Revised city. |
| `goal_amount` | `float` | No | Greater than `0.0` | Revised goal amount. |
| `urgency_level` | `string` | No | Enum: `LOW`/`MEDIUM`/`HIGH`/`CRITICAL` | Revised urgency level. |
| `cover_image` | `string` | No | URL | Revised cover image URL. |
| `deadline` | `string` | No | ISO 8601 Datetime string | Revised deadline. |
| `status` | `string` | No | Enum: `ACTIVE`/`DRAFT`/`COMPLETED`/`CANCELLED` | Revised campaign status. |

#### JSON Example
```json
{
  "goal_amount": 550000.00,
  "urgency_level": "critical",
  "description": "Update: Rohan has been admitted. The target has been adjusted to reflect ICU overheads."
}
```

---

### Campaign Update Announcement (CampaignUpdateCreate)
Allows campaign creators to post progress reports or thank-you messages to donors.

* **Pydantic Class:** `CampaignUpdateCreate`
* **Database Target:** `campaign_updates` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `content` | `string` | **Yes** | Length: 3 to 2000 characters | Text of the update (announcement). |
| `image_url` | `string` | No | URL | Supporting image URL (e.g. medical bill receipts). |

#### JSON Example
```json
{
  "content": "Phase 1 chemotherapy has successfully concluded! Thank you to everyone for your incredible support.",
  "image_url": "https://example.com/receipts/bill_phase_1.png"
}
```

---

### Campaign Update Commenting (UpdateCommentCreate)
Allows donors or supporters to leave encouraging comments on specific campaign updates.

* **Pydantic Class:** `UpdateCommentCreate`
* **Database Target:** `update_comments` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | **Yes** | Length: 1 to 500 characters | The comment message. |

#### JSON Example
```json
{
  "text": "Stay strong Rohan, we are all praying for your speedy recovery!"
}
```

---

### Donation & Payment Processing (PaymentProcess)
Manually submitted by a donor to issue a financial donation to a campaign.

* **Pydantic Class:** `PaymentProcess`
* **Database Target:** `donations` and `transactions` tables

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `campaign_id` | `integer` | **Yes** | - | Target campaign ID receiving the funds. |
| `amount` | `float` | **Yes** | Greater than `0.0` | Amount of money to donate. |
| `payment_method` | `string` | **Yes** | Must be: `"upi"`, `"card"`, `"wallet"`, or `"bank"` | The digital gateway channel chosen. |
| `anonymous` | `boolean` | No | Default: `false` | If true, hides name and city on public timelines. |
| `message` | `string` | No | Maximum length: 500 characters | Supporting personal note. |
| `donor_details` | `object` | No | See Sub-fields below | Contact details in case of billing or receipting. |

#### Sub-fields: `donor_details`
If this object is provided, it contains:
* `full_name` (`string`, Optional): Donor's billing name.
* `email` (`string`, Optional): Donor's contact email.
* `phone` (`string`, Optional): Donor's phone contact.

#### JSON Example
```json
{
  "campaign_id": 12,
  "amount": 5000.00,
  "payment_method": "upi",
  "anonymous": false,
  "message": "Supporting the noble cause. Wishing you success!",
  "donor_details": {
    "full_name": "Robert Downey",
    "email": "robert@starkindustries.com",
    "phone": "+918888888888"
  }
}
```

---

## 3. Vendor Role Schemas

Vendors use these schemas to configure their digital storefronts, service parameters, and inventory lists.

### Vendor Profile Setup (VendorProfileCreate)
Completed by Vendors to establish their medical store, grocery, or pharmacy locations.

* **Pydantic Class:** `VendorProfileCreate`
* **Database Target:** `vendors` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `shop_name` | `string` | **Yes** | - | Commercial name of the vendor store. |
| `category` | `string` | **Yes** | - | Primary product catalog (e.g., `"pharmacy"`, `"grocery"`, `"medical"`). |
| `lat` | `float` | **Yes** | - | Shop location latitude. |
| `lng` | `float` | **Yes** | - | Shop location longitude. |
| `city` | `string` | **Yes** | - | Store operational city. |
| `area` | `string` | No | - | Sub-locality or neighborhood (e.g. `"Vashi"`, `"Belapur"`). |
| `service_radius` | `float` | No | Default: `10.0` | Maximum operational delivery circle in kilometers. |
| `service_areas` | `string` | No | Comma-separated | Dedicated suburbs served. |
| `registration_id` | `string` | No | - | Commercial license or GST number for verification. |
| `opening_hours` | `string` | No | Default: `"09:00-21:00"` | Daily hours of operation. |
| `lead_time` | `string` | No | - | Expected pack & ship time (e.g., `"2 hours"`). |
| `avg_response_time`| `integer` | No | Default: `15` | Quoted chat or confirm latency in minutes. |
| `image_url` | `string` | No | URL | Storefront photo link. |
| `is_active` | `boolean` | No | Default: `true` | Setting this to false makes the vendor offline. |

#### JSON Example
```json
{
  "shop_name": "Apex Medicos & Surgical",
  "category": "pharmacy",
  "lat": 19.0330,
  "lng": 73.0297,
  "city": "Navi Mumbai",
  "area": "Vashi",
  "service_radius": 15.5,
  "service_areas": "Vashi, Kopar Khairane, Sanpada",
  "registration_id": "GSTIN27AAAAA1111A1Z1",
  "opening_hours": "08:00-23:00",
  "lead_time": "30 minutes",
  "avg_response_time": 10,
  "image_url": "https://example.com/stores/apex_medicos.jpg",
  "is_active": true
}
```

---

### Inventory Resource Creation (InventoryCreate)
Used by Vendors to add catalog products, surgical stock, or drugs to their active inventory.

* **Pydantic Class:** `InventoryCreate`
* **Database Target:** `inventory` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `resource_name` | `string` | **Yes** | Length: 2 to 100 characters | Name of product (e.g. `"N95 Masks Package"`). |
| `category` | `string` | **Yes** | Length: 2 to 50 characters | Category (e.g. `"protective_gear"`, `"drugs"`). |
| `sku_code` | `string` | No | Unique per store | SKU identifier or barcode. |
| `brand_name` | `string` | No | - | Manufacturer brand (e.g. `"3M"`, `"Cipla"`). |
| `description` | `string` | No | Maximum length: 2000 characters| Detailed parameters or details. |
| `image_url` | `string` | No | URL | Product image asset link. |
| `specifications` | `string` | No | JSON-formatted string | Complex custom specifications metadata. |
| `quantity` | `integer` | **Yes** | Minimum value: `0` | Available stock count. |
| `reorder_level` | `integer` | No | Default: `10` | Low-stock reminder threshold count. |
| `price` | `float` | No | Minimum value: `0.0` | Cost of one item in local currency. |
| `expiry_date` | `string` | No | ISO 8601 Datetime string | Expiration timestamp (crucial for medical stock!). |

#### JSON Example
```json
{
  "resource_name": "Cipla Paracetamol 650mg",
  "category": "drugs",
  "sku_code": "CIP-PARA-650-100",
  "brand_name": "Cipla",
  "description": "Standard anti-inflammatory and fever reducer pills. Strip of 15 tablets.",
  "specifications": "{\"form\": \"tablet\", \"pack_size\": 15, \"active_ingredient\": \"Paracetamol\"}",
  "quantity": 250,
  "reorder_level": 25,
  "price": 32.50,
  "expiry_date": "2027-12-31T00:00:00Z"
}
```

---

### Inventory Resource Update (InventoryUpdate)
Used by Vendors to update product stock, descriptions, and pricing parameters.

* **Pydantic Class:** `InventoryUpdate`
* **Database Target:** `inventory` table

#### Field Reference
All fields in this schema are **optional**. Only provided fields will be modified.

| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `quantity` | `integer` | No | Minimum value: `0` | New total quantity on hand. |
| `reserved_quantity` | `integer` | No | Minimum value: `0` | Units on hold for outstanding requests. |
| `reorder_level` | `integer` | No | - | Revised alert threshold. |
| `price` | `float` | No | Minimum value: `0.0` | Updated price. |
| `description` | `string` | No | - | Updated description. |
| `image_url` | `string` | No | URL | Updated product image link. |
| `specifications` | `string` | No | JSON string | Updated technical parameters. |
| `expiry_date` | `string` | No | ISO 8601 Datetime string | Updated expiry date. |

#### JSON Example
```json
{
  "quantity": 300,
  "price": 30.00,
  "reserved_quantity": 5
}
```

---

## 4. Administrator Role Schemas

Admin users use these schemas to adjust global ranking configurations, verify crowdfunding campaigns, and manually override campaign lifecycle states.

### Scoring Weights Configuration (ScoringWeightsUpdate)
Used in the Admin Dashboard to dynamically tune the EmpathI AI Matching Engine.

* **Pydantic Class:** `ScoringWeightsUpdate`
* **Database Target:** `scoring_config` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ml_weight` | `float` | **Yes** | - | Weight assigned to Machine Learning recommendations. |
| `urgency_weight` | `float` | **Yes** | - | Weight assigned to requester urgency priorities. |
| `fairness_weight` | `float` | **Yes** | - | Weight assigned to the vendor fairness index. |
| `stock_weight` | `float` | **Yes** | - | Weight assigned to inventory availability levels. |
| `freshness_weight` | `float` | **Yes** | - | Weight assigned to catalog update timestamps. |

> [!WARNING]
> Adjusting these parameters changes the scoring ranks for **all** matching algorithms globally in real-time.

#### JSON Example
```json
{
  "ml_weight": 0.35,
  "urgency_weight": 0.25,
  "fairness_weight": 0.15,
  "stock_weight": 0.15,
  "freshness_weight": 0.10
}
```

---

### Campaign Verification Status (CampaignVerifyRequest)
Used by platform trust & safety admins to mark crowdfunding campaigns as officially verified (with badge).

* **Pydantic Class:** `CampaignVerifyRequest`
* **Database Target:** `campaigns` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `verified` | `boolean` | **Yes** | - | Verification status of the target campaign. |

#### JSON Example
```json
{
  "verified": true
}
```

---

### Campaign Status Administrative Override (CampaignStatusUpdate)
Allows admins to force campaigns into drafts, close them as completed, or cancel them for policy violations.

* **Pydantic Class:** `CampaignStatusUpdate`
* **Database Target:** `campaigns` table

#### Field Reference
| Field | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | Case-insensitive<br>Must be: `"ACTIVE"`, `"DRAFT"`, `"COMPLETED"`, or `"CANCELLED"` | Admin override campaign state. |

#### JSON Example
```json
{
  "status": "cancelled"
}
```
