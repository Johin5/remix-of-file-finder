import React from 'react';
import { 
  Pizza, Car, ShoppingBag, Home, Banknote, Laptop, Film, Activity, 
  ArrowRightLeft, Coffee, Smartphone, Plane, Dumbbell, Gift, Baby, 
  PawPrint, Wrench, Zap, Book, Music, GraduationCap, Briefcase, 
  Heart, Smile, Tag, ShoppingCart, Utensils, Bus, Train, 
  Gamepad2, Stethoscope, Landmark, Fuel, Shirt, Scissors
} from 'lucide-react';

export const ICON_MAP: { [key: string]: React.ElementType } = {
  'pizza': Pizza,
  'utensils': Utensils,
  'coffee': Coffee,
  'car': Car,
  'bus': Bus,
  'train': Train,
  'fuel': Fuel,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  'shirt': Shirt,
  'scissors': Scissors,
  'home': Home,
  'zap': Zap,
  'wrench': Wrench,
  'banknote': Banknote,
  'landmark': Landmark,
  'laptop': Laptop,
  'briefcase': Briefcase,
  'film': Film,
  'music': Music,
  'gamepad-2': Gamepad2,
  'activity': Activity,
  'stethoscope': Stethoscope,
  'dumbbell': Dumbbell,
  'heart': Heart,
  'arrow-right-left': ArrowRightLeft,
  'smartphone': Smartphone,
  'plane': Plane,
  'gift': Gift,
  'baby': Baby,
  'paw-print': PawPrint,
  'book': Book,
  'graduation-cap': GraduationCap,
  'smile': Smile,
  'tag': Tag,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface CategoryIconProps {
  iconName: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ iconName, size = 20, className = "" }) => {
  const IconComponent = ICON_MAP[iconName] || Tag;
  return <IconComponent size={size} className={className} strokeWidth={2} />;
};
