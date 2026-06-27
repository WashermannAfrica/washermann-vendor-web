export interface VendorUser {
  id: string;
  fullName: string;
  email: string | null;
  phone?: string | null;
  roles: string[];
  status: string;
  emailVerified?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type VerificationStatus = 'pending_review' | 'verified' | 'rejected' | 'suspended';

export interface VendorProfile {
  id: string;
  userId: string;
  businessName: string | null;
  phone: string | null;
  areaIds: string[];
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  isAvailable: boolean;
  logoUrl: string | null;
  pricingLastUpdatedAt: string | null;
  createdAt: string;
}

export interface CatalogueItem {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  isEveryday: boolean;
  priceNgn: number | null;
  priceWp: number | null;
}

export interface CatalogueCategory {
  id: string;
  name: string;
  items: CatalogueItem[];
}

export interface ServiceArea {
  id: string;
  name: string;
  state: string;
  locations: { id: string; name: string }[];
}
