import React from 'react';
import {
  Category as CategoryIcon,
  LocalBar as LiquorIcon,
  Store as BreadIcon,
  EmojiFoodBeverage as CoffeeIcon,
  SmokingRooms as CigarettesIcon,
  Inventory as WholesaleIcon,
  Fastfood as JunkFoodIcon,
  Restaurant as CondimentsIcon,
  Kitchen as IngredientsIcon,
  Widgets as CanGoodsIcon,
  CleaningServices as DetergentIcon,
  DinnerDining as NoodlesIcon,
  KitchenOutlined as KitchenThingsIcon,
  LocalLaundryService as LaundryIcon,
  Face as CosmeticsIcon,
  Cookie as CookieIcon,
  LocalCafe as DrinksIcon,
  ColorLens as DressingsIcon,
  Opacity as ButterIcon,
  Spa as FabricConditionerIcon,
  Cake as CandiesIcon,
  Favorite as ChocolateIcon,
  AcUnit as FrozenIcon,
  Icecream as IceCreamIcon,
  Soap as ToiletriesIcon,
  LocalDrink as MilkIcon,
  Agriculture as CerealsIcon,
} from '@mui/icons-material';
import type { Category } from '../App';

type IconComponent = typeof CategoryIcon;

// Icons chosen for a category in Settings, by the name stored on the category
const BY_ICON_NAME: Record<string, IconComponent> = {
  LiquorIcon,
  BreadIcon,
  MilkIcon,
  CoffeeIcon,
  CigarettesIcon,
  WholesaleIcon,
  JunkFoodIcon,
  CondimentsIcon,
  IngredientsIcon,
  CanGoodsIcon,
  DetergentIcon,
  NoodlesIcon,
  KitchenThingsIcon,
  LaundryIcon,
  CosmeticsIcon,
  CookingBakingIcon: CookieIcon,
  DrinksIcon,
  CerealsIcon,
  DressingsIcon,
  BiscuitsIcon: CookieIcon,
  ButterIcon,
  FabricConditionerIcon,
  CandiesIcon,
  ChocolateIcon,
  FrozenIcon,
  IceCreamIcon,
  ToiletriesIcon,
};

// Older categories without a stored icon are matched by name
const BY_CATEGORY_NAME: Record<string, IconComponent> = {
  LIQUOR: LiquorIcon,
  BREAD: BreadIcon,
  MILK: MilkIcon,
  COFFEE: CoffeeIcon,
  CIGARETTES: CigarettesIcon,
  'WHOLE SALE': WholesaleIcon,
  'JUNK FOOD': JunkFoodIcon,
  CONDIMENTS: CondimentsIcon,
  INGREDIENTS: IngredientsIcon,
  'CAN GOODS': CanGoodsIcon,
  DETERGENT: DetergentIcon,
  NOODLES: NoodlesIcon,
  'KITCHEN THINGS': KitchenThingsIcon,
  'LAUNDRY SOAP': LaundryIcon,
  COSMETICS: CosmeticsIcon,
  'COOKING AND BAKING': CookieIcon,
  DRINKS: DrinksIcon,
  CEREALS: CerealsIcon,
  DRESSINGS: DressingsIcon,
  BISCUITS: CookieIcon,
  BUTTER: ButterIcon,
  'FABRIC CONDITIONER': FabricConditionerIcon,
  CANDIES: CandiesIcon,
  CHOCOLATE: ChocolateIcon,
  FROZEN: FrozenIcon,
  'ICE CREAM': IceCreamIcon,
  TOILETRIES: ToiletriesIcon,
};

/** The icon for a category: its chosen icon, else a match on its name, else a generic one. */
export const categoryIcon = (categoryName: string, categories: Category[]): React.ReactElement => {
  const stored = categories.find((c) => c.name === categoryName)?.icon;
  const Icon = (stored ? BY_ICON_NAME[stored] : BY_CATEGORY_NAME[categoryName.toUpperCase()]) ?? CategoryIcon;
  return <Icon />;
};
