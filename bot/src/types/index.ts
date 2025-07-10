export interface Profile {
  images: string[];
  [key: string]: any;
}

export interface Advertisement {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
} 