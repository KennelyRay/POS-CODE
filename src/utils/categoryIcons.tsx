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
  ShoppingBasket as BasketIcon,
  LocalGroceryStore as GroceryIcon,
  LocalPizza as PizzaIcon,
  Egg as EggIcon,
  FoodBank as FoodBankIcon,
  Liquor as AlcoholIcon,
  LocalFlorist as FloristIcon,
  LocalPharmacy as PharmacyIcon,
  Home as HomeIcon,
  BathroomOutlined as BathroomIcon,
  LocalMall as ShoppingIcon,
  RiceBowl as RiceIcon,
  Yard as YardIcon,
} from '@mui/icons-material';
import type { Category } from '../App';

type IconComponent = typeof CategoryIcon;

/** Every icon a category can have, keyed by the name stored on the category. */
export const CATEGORY_ICONS: Array<{ name: string; label: string; Icon: IconComponent }> = [
  { name: 'CategoryIcon', label: 'Default', Icon: CategoryIcon },
  { name: 'DrinksIcon', label: 'Beverages & drinks', Icon: DrinksIcon },
  { name: 'MilkIcon', label: 'Milk & dairy', Icon: MilkIcon },
  { name: 'CoffeeIcon', label: 'Coffee & tea', Icon: CoffeeIcon },
  { name: 'LiquorIcon', label: 'Liquor', Icon: LiquorIcon },
  { name: 'AlcoholIcon', label: 'Alcoholic beverages', Icon: AlcoholIcon },
  { name: 'JunkFoodIcon', label: 'Snacks', Icon: JunkFoodIcon },
  { name: 'BiscuitsIcon', label: 'Biscuits', Icon: CookieIcon },
  { name: 'CandiesIcon', label: 'Candies & sweets', Icon: CandiesIcon },
  { name: 'ChocolateIcon', label: 'Chocolate', Icon: ChocolateIcon },
  { name: 'IceCreamIcon', label: 'Ice cream', Icon: IceCreamIcon },
  { name: 'FrozenIcon', label: 'Frozen foods', Icon: FrozenIcon },
  { name: 'BreadIcon', label: 'Bread & bakery', Icon: BreadIcon },
  { name: 'CookingBakingIcon', label: 'Baking supplies', Icon: CookieIcon },
  { name: 'NoodlesIcon', label: 'Noodles & pasta', Icon: NoodlesIcon },
  { name: 'RiceIcon', label: 'Rice & staples', Icon: RiceIcon },
  { name: 'CerealsIcon', label: 'Cereals & grains', Icon: CerealsIcon },
  { name: 'CanGoodsIcon', label: 'Canned goods', Icon: CanGoodsIcon },
  { name: 'EggIcon', label: 'Eggs', Icon: EggIcon },
  { name: 'CondimentsIcon', label: 'Condiments & sauces', Icon: CondimentsIcon },
  { name: 'DressingsIcon', label: 'Dressings & oils', Icon: DressingsIcon },
  { name: 'ButterIcon', label: 'Butter & spreads', Icon: ButterIcon },
  { name: 'IngredientsIcon', label: 'Cooking ingredients', Icon: IngredientsIcon },
  { name: 'PizzaIcon', label: 'Pizza & fast food', Icon: PizzaIcon },
  { name: 'LunchIcon', label: 'Meals', Icon: FoodBankIcon },
  { name: 'FoodBankIcon', label: 'Food packs', Icon: FoodBankIcon },
  { name: 'CigarettesIcon', label: 'Cigarettes & tobacco', Icon: CigarettesIcon },
  { name: 'DetergentIcon', label: 'Detergent & cleaners', Icon: DetergentIcon },
  { name: 'CleaningIcon', label: 'Cleaning supplies', Icon: DetergentIcon },
  { name: 'LaundryIcon', label: 'Laundry', Icon: LaundryIcon },
  { name: 'FabricConditionerIcon', label: 'Fabric care', Icon: FabricConditionerIcon },
  { name: 'ToiletriesIcon', label: 'Toiletries', Icon: ToiletriesIcon },
  { name: 'BathroomIcon', label: 'Bathroom items', Icon: BathroomIcon },
  { name: 'CosmeticsIcon', label: 'Cosmetics & beauty', Icon: CosmeticsIcon },
  { name: 'PharmacyIcon', label: 'Pharmacy & medicine', Icon: PharmacyIcon },
  { name: 'KitchenThingsIcon', label: 'Kitchen items', Icon: KitchenThingsIcon },
  { name: 'HomeIcon', label: 'Home & living', Icon: HomeIcon },
  { name: 'FloristIcon', label: 'Flowers & plants', Icon: FloristIcon },
  { name: 'YardIcon', label: 'Garden & yard', Icon: YardIcon },
  { name: 'WholesaleIcon', label: 'Wholesale', Icon: WholesaleIcon },
  { name: 'BasketIcon', label: 'General shopping', Icon: BasketIcon },
  { name: 'GroceryIcon', label: 'Grocery', Icon: GroceryIcon },
  { name: 'ShoppingIcon', label: 'Shopping & retail', Icon: ShoppingIcon },
];

const BY_ICON_NAME = new Map(CATEGORY_ICONS.map((entry) => [entry.name, entry.Icon]));

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

/** The icon for a stored icon name, falling back to the generic one. */
export const iconByName = (name: string | undefined): React.ReactElement => {
  const Icon = (name && BY_ICON_NAME.get(name)) || CategoryIcon;
  return <Icon />;
};

/** The icon for a category: its chosen icon, else a match on its name, else a generic one. */
export const categoryIcon = (categoryName: string, categories: Category[]): React.ReactElement => {
  const stored = categories.find((c) => c.name === categoryName)?.icon;
  const Icon = (stored ? BY_ICON_NAME.get(stored) : BY_CATEGORY_NAME[categoryName.toUpperCase()]) ?? CategoryIcon;
  return <Icon />;
};
