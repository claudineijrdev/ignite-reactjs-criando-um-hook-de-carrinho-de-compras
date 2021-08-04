import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productOnCart = cart.find(cartItem => cartItem.id === productId);

      if (productOnCart) {
        updateProductAmount({ productId, amount: productOnCart.amount + 1 })
      } else {
        const apiResponse = await api.get(`/products/${productId}`);
        const product: Product = apiResponse.data;
        if (!product) {
          toast.error('Erro na adição do produto');
          return;
        } else {
          const preCart = cart;
          preCart.push({...product, amount: 1}) 
          setCart([...preCart]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(preCart));
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productOnCart = cart.find(cartItem => cartItem.id === productId);
      if (!productOnCart) {
        throw new Error('');
      }
      if (productOnCart.amount > 1)
        updateProductAmount({ productId, amount: productOnCart.amount - 1 })
      else {
        const filteredCart = cart.filter(product => product.id !== productId);
        setCart([...filteredCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredCart));
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productStock: Stock = await (await api.get(`/stock/${productId}`)).data;

      if (amount <= 0) {
        return;
      }

      if (amount > productStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productIndex = cart.findIndex(cartItem => cartItem.id === productId);
      if (productIndex >= 0) {
        const changedCart = cart;
        changedCart[productIndex].amount = amount;
        setCart([...changedCart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(changedCart));
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
