// Shared TypeScript types for Chaitu's Naturals.
// These mirror the Supabase tables created in supabase/schema.sql.

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  has_offer: boolean;
  offer_kind: 'percent' | 'fixed';
  offer_value: number;
  offer_ends_at: string | null;
  in_stock: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string;
  position: number;
}

export interface ProductWithImages extends Product {
  images: ProductImage[];
  avg_rating: number;
  review_count: number;
}

export interface Headline {
  id: string;
  title: string;
  message: string;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string;
  approved: boolean;
  photo_urls: string[];
  created_at: string;
}
