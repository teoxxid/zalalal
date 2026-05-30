// frontend/src/types/Service.ts

export interface Service {
  id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  category: string;
  brand: string;
  rating: number;
  [key: string]: any; // для дополнительных полей
}
