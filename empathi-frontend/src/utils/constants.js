export const USER_ROLES = {
  DONOR: 'donor',
  NGO: 'ngo',
  VERIFIER: 'verifier',
  ADMIN: 'admin',
  VENDOR: 'vendor',
}

export const RESOURCE_TYPES = {
  OXYGEN: 'oxygen',
  MEDICINE: 'medicine',
  FOOD: 'food',
  TRANSPORT: 'transport',
  SHELTER: 'shelter',
  OTHER: 'other',
}

export const URGENCY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  NEEDS_MORE_INFO: 'needs_more_info',
}

export const RESOURCE_REQUEST_STATUS = {
  PENDING_MATCH: 'pending_match',
  MATCHED: 'matched',
  IN_TRANSIT: 'in_transit',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
}

export const CAMPAIGN_TYPES = {
  FUNDRAISING: 'fundraising',
  RESOURCE_REQUEST: 'resource_request',
  EMERGENCY: 'emergency',
}

export const NOTIFICATION_TYPES = {
  DONATION_IMPACT: 'donation_impact',
  RESOURCE_MATCHED: 'resource_matched',
  VERIFICATION_NEEDED: 'verification_needed',
  FUND_UNLOCKED: 'fund_unlocked',
  EMERGENCY_DECLARED: 'emergency_declared',
  PROOF_OF_RESOLUTION: 'proof_of_resolution',
  CAMPAIGN_UPDATED: 'campaign_updated',
}

export const ROLE_DESCRIPTIONS = {
  [USER_ROLES.DONOR]: 'Donate and help in emergencies with fractional emergency fund contribution',
  [USER_ROLES.NGO]: 'Create campaigns and request resources for emergencies',
  [USER_ROLES.VERIFIER]: 'Verify emergency requests and proof-of-resolution',
  [USER_ROLES.ADMIN]: 'Declare emergencies, manage emergency fund, oversee platform',
  [USER_ROLES.VENDOR]: 'Declare resources and fulfill emergency requests',
}

export const VERIFICATION_TYPES = {
  MEDICAL_PROFESSIONAL: 'medical_professional',
  NGO_REPRESENTATIVE: 'ngo_representative',
  LOCAL_VOLUNTEER: 'local_volunteer',
  GOVERNMENT_OFFICIAL: 'government_official',
}

export const EMERGENCY_FUND_DEFAULT_PERCENTAGE = 5

export const CITY_OPTIONS = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune',
]

export const DEFAULT_URGENCY_DEADLINE_HOURS = 24

export const RESOURCE_UNITS = {
  oxygen: 'cylinders',
  medicine: 'tablets',
  food: 'meals',
  transport: 'km',
  shelter: 'beds',
}
