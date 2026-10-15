export type IntegrationListResponse<T> = {
  success: boolean;
  message: string;
  data?: T[];
  offset: number;
  limit: number;
  total: number;
};

/** Summary row from `GET /integrations/v1/members`. */
export type IntegrationMemberListItem = {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  status?: string;
  updatedAt?: string;
};

/** Full record from `GET /integrations/v1/members/:id`. */
export type IntegrationMember = {
  id: string;
  type?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  businessName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  phoneExtension?: string;
  dateOfBirth?: string;
  gender?: string;
  status?: string;
  checkoutStatus?: string;
  memberId?: string;
  tenantId?: string;
  tenantGroupCode?: string;
  leadSource?: string;
  textEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  membership?: IntegrationMembership;
  address?: Record<string, string | undefined>;
  mailingAddress?: Record<string, string | undefined>;
  relationship?: Record<string, string | undefined>;
  tags?: string[];
  insurance?: Record<string, unknown>;
  phones?: Array<{ type?: string; value?: string; extension?: string }>;
};

/** Summary row from membership list endpoints (`/memberships`, `/members/:id/memberships`, `/users/:userId/memberships`). */
export type IntegrationMembershipListItem = {
  id: string;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
  status?: string;
  offeringName?: string;
  tier?: string;
  startDate?: string;
  endDate?: string;
  updatedAt?: string;
};

/** Full record from `GET /integrations/v1/memberships/:id`. */
export type IntegrationMembership = {
  id: string;
  memberId?: string;
  memberName?: string;
  memberEmail?: string;
  status?: string;
  checkoutStatus?: string;
  tier?: string;
  startDate?: string;
  endDate?: string;
  renewalDate?: string;
  nextBillingDate?: string;
  billingType?: string;
  billingInterval?: string;
  groupCode?: string;
  tenantGroupCode?: string;
  cost?: number;
  registrationFee?: number;
  offeringName?: string;
  offeringId?: string;
  createdAt?: string;
  updatedAt?: string;
};
