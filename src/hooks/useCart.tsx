import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const productsExists = cart.find((product) => product.id === productId)
      const stock = await api.get(`stock/${productId}`)
      const stockAmount = stock.data.amount
      const currentAmount = productsExists ? productsExists.amount : 0
      const amount = currentAmount + 1

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (productsExists) {
        const data: Product[] = cart.map((product) => {
          {
            if (product.id === productId) {
              return {
                ...product,
                amount: product.amount + 1,
              }
            }

            return product
          }
        })
        setCart(data)
      } else {
        const response = await api.get(`products/${productId}`)

        const data = response.data
        data.amount = 1

        setCart([...cart, data])
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId)
      if (productExists) {
        const data: Product[] = cart.filter(
          (product) => product.id !== productId
        )
        setCart(data)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const selectedProduct = cart.find((product) => product.id === productId)
      const stock = await api.get(`stock/${productId}`)
      const stockAmount = stock.data.amount

      if (amount < 1) {
        throw Error()
      }

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (selectedProduct) {
        const data: Product[] = cart.map((product) => {
          {
            if (product.id === productId) {
              return {
                ...product,
                amount: amount,
              }
            }
            return product
          }
        })
        setCart(data)
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
