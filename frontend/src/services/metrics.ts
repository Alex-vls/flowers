// Yandex.Metrika ecommerce events service
declare global {
  interface Window {
    ym: (
      counterId: number,
      action: string,
      ...params: any[]
    ) => void;
    dataLayer: any[];
  }
}

const METRIKA_ID = 103487070;

// Initialize dataLayer if not exists
if (typeof window !== 'undefined' && !window.dataLayer) {
  window.dataLayer = [];
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  brand?: string;
  variant?: string;
}

interface Purchase {
  transaction_id: string;
  affiliation?: string;
  value: number;
  currency: string;
  items: Product[];
}

class MetricsService {
  // Track page view
  static trackPageView(page_title?: string, page_location?: string) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'hit', page_location || window.location.href, {
          title: page_title || document.title
        });
      }
    } catch (error) {
      console.warn('Metrika page view tracking failed:', error);
    }
  }

  // Track product view
  static trackProductView(product: Omit<Product, 'quantity'>) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'product_view', {
          product_id: product.id,
          product_name: product.name,
          category: product.category,
          price: product.price
        });
      }

      // Enhanced ecommerce
      window.dataLayer?.push({
        event: 'view_item',
        ecommerce: {
          currency: 'RUB',
          value: product.price,
          items: [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.category,
            price: product.price,
            quantity: 1
          }]
        }
      });
    } catch (error) {
      console.warn('Product view tracking failed:', error);
    }
  }

  // Track add to cart
  static trackAddToCart(product: Product) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'add_to_cart', {
          product_id: product.id,
          product_name: product.name,
          quantity: product.quantity,
          value: product.price * product.quantity
        });
      }

      window.dataLayer?.push({
        event: 'add_to_cart',
        ecommerce: {
          currency: 'RUB',
          value: product.price * product.quantity,
          items: [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.category,
            price: product.price,
            quantity: product.quantity
          }]
        }
      });
    } catch (error) {
      console.warn('Add to cart tracking failed:', error);
    }
  }

  // Track remove from cart
  static trackRemoveFromCart(product: Product) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'remove_from_cart', {
          product_id: product.id,
          value: product.price * product.quantity
        });
      }

      window.dataLayer?.push({
        event: 'remove_from_cart',
        ecommerce: {
          currency: 'RUB',
          value: product.price * product.quantity,
          items: [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.category,
            price: product.price,
            quantity: product.quantity
          }]
        }
      });
    } catch (error) {
      console.warn('Remove from cart tracking failed:', error);
    }
  }

  // Track begin checkout
  static trackBeginCheckout(items: Product[], total_value: number) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'begin_checkout', {
          value: total_value,
          items_count: items.length
        });
      }

      window.dataLayer?.push({
        event: 'begin_checkout',
        ecommerce: {
          currency: 'RUB',
          value: total_value,
          items: items.map(item => ({
            item_id: item.id,
            item_name: item.name,
            item_category: item.category,
            price: item.price,
            quantity: item.quantity
          }))
        }
      });
    } catch (error) {
      console.warn('Begin checkout tracking failed:', error);
    }
  }

  // Track purchase
  static trackPurchase(purchase: Purchase) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'purchase', {
          order_id: purchase.transaction_id,
          revenue: purchase.value,
          currency: purchase.currency
        });
      }

      window.dataLayer?.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: purchase.transaction_id,
          affiliation: purchase.affiliation || 'MSK Flower',
          value: purchase.value,
          currency: purchase.currency,
          items: purchase.items.map(item => ({
            item_id: item.id,
            item_name: item.name,
            item_category: item.category,
            price: item.price,
            quantity: item.quantity
          }))
        }
      });
    } catch (error) {
      console.warn('Purchase tracking failed:', error);
    }
  }

  // Track subscription events
  static trackSubscription(action: 'subscribe' | 'unsubscribe' | 'pause' | 'resume', subscription_type: string, value?: number) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', `subscription_${action}`, {
          subscription_type,
          value: value || 0
        });
      }

      window.dataLayer?.push({
        event: `subscription_${action}`,
        subscription_type,
        value: value || 0
      });
    } catch (error) {
      console.warn('Subscription tracking failed:', error);
    }
  }

  // Track search
  static trackSearch(search_term: string, results_count?: number) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'search', {
          search_term,
          results_count: results_count || 0
        });
      }

      window.dataLayer?.push({
        event: 'search',
        search_term,
        results_count: results_count || 0
      });
    } catch (error) {
      console.warn('Search tracking failed:', error);
    }
  }

  // Track filter usage
  static trackFilterUsage(filter_type: string, filter_value: string) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'filter_used', {
          filter_type,
          filter_value
        });
      }

      window.dataLayer?.push({
        event: 'filter_used',
        filter_type,
        filter_value
      });
    } catch (error) {
      console.warn('Filter tracking failed:', error);
    }
  }

  // Track review submission
  static trackReviewSubmitted(product_id: string, rating: number) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'review_submitted', {
          product_id,
          rating
        });
      }

      window.dataLayer?.push({
        event: 'review_submitted',
        product_id,
        rating
      });
    } catch (error) {
      console.warn('Review tracking failed:', error);
    }
  }

  // Track loyalty program activity
  static trackLoyaltyActivity(action: 'points_earned' | 'points_redeemed' | 'referral', points?: number) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', `loyalty_${action}`, {
          points: points || 0
        });
      }

      window.dataLayer?.push({
        event: `loyalty_${action}`,
        points: points || 0
      });
    } catch (error) {
      console.warn('Loyalty tracking failed:', error);
    }
  }

  // Track Telegram Mini App usage
  static trackTelegramMiniApp(action: string, data?: any) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', `telegram_${action}`, data);
      }

      window.dataLayer?.push({
        event: `telegram_${action}`,
        ...data
      });
    } catch (error) {
      console.warn('Telegram Mini App tracking failed:', error);
    }
  }

  // Track custom events
  static trackCustomEvent(event_name: string, parameters?: any) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', event_name, parameters);
      }

      window.dataLayer?.push({
        event: event_name,
        ...parameters
      });
    } catch (error) {
      console.warn('Custom event tracking failed:', error);
    }
  }

  // Track time spent on page (call this when user leaves page)
  static trackTimeOnPage(page_path: string, time_seconds: number) {
    try {
      if (window.ym) {
        window.ym(METRIKA_ID, 'reachGoal', 'time_on_page', {
          page_path,
          time_seconds
        });
      }
    } catch (error) {
      console.warn('Time on page tracking failed:', error);
    }
  }
}

export default MetricsService;

// Helper hook for tracking page views in React
export const usePageTracking = () => {
  const trackPageView = (title?: string) => {
    MetricsService.trackPageView(title);
  };

  return { trackPageView };
};

// Helper for measuring time on page
export const useTimeTracking = (page_path: string) => {
  const startTime = Date.now();

  const trackTimeSpent = () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    MetricsService.trackTimeOnPage(page_path, timeSpent);
  };

  return { trackTimeSpent };
}; 