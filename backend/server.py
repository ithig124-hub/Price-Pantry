from fastapi import FastAPI, APIRouter, Query, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
import aiohttp
import asyncio
import resend
from bs4 import BeautifulSoup
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import random
import re
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# PricesAPI Configuration
PRICES_API_KEY = os.environ.get('PRICES_API_KEY', '')
PRICES_API_BASE = "https://api.pricesapi.io/api/v1"

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Store configurations with colors
STORES = {
    "coles": {"name": "Coles", "color": "#E01A22", "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Coles_logo.svg/1200px-Coles_logo.svg.png", "url": "https://www.coles.com.au"},
    "woolworths": {"name": "Woolworths", "color": "#178841", "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Woolworths_Logo_2012.svg/1200px-Woolworths_Logo_2012.svg.png", "url": "https://www.woolworths.com.au"},
    "aldi": {"name": "Aldi", "color": "#001E79", "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/ALDI_logo_2017.svg/1200px-ALDI_logo_2017.svg.png", "url": "https://www.aldi.com.au"},
    "iga": {"name": "IGA", "color": "#DA291C", "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/IGA_logo.svg/1200px-IGA_logo.svg.png", "url": "https://www.iga.com.au"},
    "costco": {"name": "Costco", "color": "#005DAA", "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Costco_Wholesale_logo_2010-10-26.svg/1200px-Costco_Wholesale_logo_2010-10-26.svg.png", "url": "https://www.costco.com.au"}
}

CATEGORIES = [
    "Fruit & Veg",
    "Dairy & Eggs", 
    "Meat & Seafood",
    "Bakery",
    "Pantry",
    "Frozen",
    "Beverages",
    "Snacks",
    "Household",
    "Personal Care"
]

# Track API usage
api_usage = {
    "calls_made": 0,
    "monthly_limit": 1000,
    "last_reset": datetime.now(timezone.utc).replace(day=1)
}

# Cache for API results and scraped data
price_cache: Dict[str, Dict] = {}
CACHE_DURATION = 3600  # 1 hour in seconds

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================
# WEB SCRAPING FOR AUSTRALIAN STORES
# ============================================

async def scrape_coles_prices(query: str) -> List[Dict]:
    """Scrape prices from Coles website"""
    products = []
    try:
        search_url = f"https://www.coles.com.au/search?q={query.replace(' ', '%20')}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-AU,en;q=0.9',
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(search_url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'lxml')
                    
                    product_tiles = soup.select('[data-testid="product-tile"]') or soup.select('.product-tile') or soup.select('.product')
                    
                    for tile in product_tiles[:10]:
                        try:
                            name_elem = tile.select_one('[data-testid="product-title"]') or tile.select_one('.product-title') or tile.select_one('h3')
                            price_elem = tile.select_one('[data-testid="product-price"]') or tile.select_one('.price') or tile.select_one('.product-price')
                            
                            if name_elem and price_elem:
                                name = name_elem.get_text(strip=True)
                                price_text = price_elem.get_text(strip=True)
                                price_match = re.search(r'\$?(\d+\.?\d*)', price_text)
                                
                                if price_match:
                                    price = float(price_match.group(1))
                                    products.append({
                                        "name": name,
                                        "price": price,
                                        "store": "coles",
                                        "source": "scrape"
                                    })
                        except Exception as e:
                            logger.debug(f"Error parsing Coles product: {e}")
                            continue
                            
    except Exception as e:
        logger.error(f"Error scraping Coles: {e}")
    
    return products

async def scrape_woolworths_prices(query: str) -> List[Dict]:
    """Scrape prices from Woolworths website"""
    products = []
    try:
        search_url = f"https://www.woolworths.com.au/shop/search/products?searchTerm={query.replace(' ', '%20')}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-AU,en;q=0.9',
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(search_url, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'lxml')
                    
                    product_tiles = soup.select('.product-tile-v2') or soup.select('.shelfProductTile') or soup.select('[data-testid="product-tile"]')
                    
                    for tile in product_tiles[:10]:
                        try:
                            name_elem = tile.select_one('.product-title') or tile.select_one('.shelfProductTile-title') or tile.select_one('h3')
                            price_elem = tile.select_one('.price') or tile.select_one('.product-price') or tile.select_one('[class*="price"]')
                            
                            if name_elem and price_elem:
                                name = name_elem.get_text(strip=True)
                                price_text = price_elem.get_text(strip=True)
                                price_match = re.search(r'\$?(\d+\.?\d*)', price_text)
                                
                                if price_match:
                                    price = float(price_match.group(1))
                                    products.append({
                                        "name": name,
                                        "price": price,
                                        "store": "woolworths",
                                        "source": "scrape"
                                    })
                        except Exception as e:
                            logger.debug(f"Error parsing Woolworths product: {e}")
                            continue
                            
    except Exception as e:
        logger.error(f"Error scraping Woolworths: {e}")
    
    return products

async def scrape_all_stores(query: str) -> Dict[str, List[Dict]]:
    """Scrape prices from all Australian stores concurrently"""
    cache_key = f"scrape:{query}"
    now = datetime.now(timezone.utc)
    
    if cache_key in price_cache:
        cached = price_cache[cache_key]
        if (now.timestamp() - cached["timestamp"]) < CACHE_DURATION:
            return cached["data"]
    
    coles_task = scrape_coles_prices(query)
    woolworths_task = scrape_woolworths_prices(query)
    
    results = await asyncio.gather(coles_task, woolworths_task, return_exceptions=True)
    
    scraped_data = {
        "coles": results[0] if isinstance(results[0], list) else [],
        "woolworths": results[1] if isinstance(results[1], list) else []
    }
    
    price_cache[cache_key] = {
        "data": scraped_data,
        "timestamp": now.timestamp()
    }
    
    return scraped_data

# ============================================
# EMAIL NOTIFICATIONS
# ============================================

async def send_price_alert_email(recipient_email: str, product_name: str, target_price: float, current_price: float, store_name: str):
    """Send price drop alert email"""
    if not RESEND_API_KEY:
        logger.warning("Resend API key not configured, skipping email")
        return False
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Manrope', Arial, sans-serif; background-color: #FAFAFA; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border: 2px solid black; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #00E676; padding: 20px; text-align: center; border-bottom: 2px solid black;">
                <h1 style="margin: 0; color: black; font-size: 24px;">🎉 Price Drop Alert!</h1>
            </div>
            <div style="padding: 30px;">
                <h2 style="margin: 0 0 10px 0; color: #333;">{product_name}</h2>
                <p style="color: #666; margin: 0 0 20px 0;">A product on your watchlist has dropped in price!</p>
                <div style="background-color: #F4F4F5; border: 2px solid #E4E4E7; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <div style="margin-bottom: 10px;">
                        <span style="color: #666;">Your Target Price:</span>
                        <span style="font-family: monospace; font-weight: bold; float: right;">${target_price:.2f}</span>
                    </div>
                    <div>
                        <span style="color: #666;">Current Price at {store_name}:</span>
                        <span style="font-family: monospace; font-weight: bold; color: #00E676; font-size: 20px; float: right;">${current_price:.2f}</span>
                    </div>
                </div>
                <p style="color: #666;">You're saving <strong style="color: #00E676;">${(target_price - current_price):.2f}</strong> compared to your target!</p>
                <a href="https://grocerysaver-2.preview.emergentagent.com/search?q={product_name.replace(' ', '%20')}" 
                   style="display: inline-block; background-color: #00E676; color: black; padding: 12px 24px; text-decoration: none; font-weight: bold; border: 2px solid black; border-radius: 8px; margin-top: 20px;">
                    View Deal →
                </a>
            </div>
            <div style="background-color: #F4F4F5; padding: 15px; text-align: center; border-top: 2px solid #E4E4E7;">
                <p style="margin: 0; color: #666; font-size: 12px;">
                    PricePantry - Compare grocery prices across Coles, Woolworths, Aldi, IGA & Costco
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [recipient_email],
            "subject": f"🎉 Price Drop: {product_name} is now ${current_price:.2f}!",
            "html": html_content
        }
        
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Price alert email sent to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

async def check_price_alerts_and_notify():
    """Background task to check price alerts and send notifications"""
    try:
        alerts = await db.price_alerts.find({"triggered": False}, {"_id": 0}).to_list(100)
        
        for alert in alerts:
            products = [p for p in MOCK_PRODUCTS if p["id"] == alert.get("product_id")]
            if products:
                product = products[0]
                best_price = None
                best_store = None
                
                for store, price_data in product.get("store_prices", {}).items():
                    if price_data.get("available") and price_data.get("price", 0) > 0:
                        if best_price is None or price_data["price"] < best_price:
                            best_price = price_data["price"]
                            best_store = STORES.get(store, {}).get("name", store)
                
                if best_price and best_price <= alert.get("target_price", 0):
                    if alert.get("email"):
                        await send_price_alert_email(
                            alert["email"],
                            alert["product_name"],
                            alert["target_price"],
                            best_price,
                            best_store
                        )
                    
                    await db.price_alerts.update_one(
                        {"id": alert["id"]},
                        {"$set": {"triggered": True, "triggered_at": datetime.now(timezone.utc).isoformat()}}
                    )
    except Exception as e:
        logger.error(f"Error checking price alerts: {e}")

# ============================================
# PRICE HISTORY GENERATION
# ============================================

def generate_price_history(base_price: float, days: int = 30) -> List[Dict]:
    """Generate mock price history for a product"""
    history = []
    current_date = datetime.now(timezone.utc)
    
    for i in range(days, -1, -1):
        date = current_date - timedelta(days=i)
        # Add some realistic price variation
        variation = random.uniform(-0.15, 0.15)
        # Occasionally add a sale price (20% of the time)
        if random.random() < 0.2:
            variation = random.uniform(-0.25, -0.15)
        
        price = round(base_price * (1 + variation), 2)
        
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": price,
            "was_on_sale": variation < -0.15
        })
    
    return history

# ============================================
# MOCK PRODUCTS DATA - EXPANDED WITH BETTER IMAGES
# ============================================

def generate_mock_products():
    products = [
        # FRUIT & VEG (25 items)
        {"name": "Royal Gala Apples", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "1kg", "unit": "kg", "image": "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400", "base_price": 4.50},
        {"name": "Cavendish Bananas", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "1kg", "unit": "kg", "image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", "base_price": 3.20},
        {"name": "Strawberries Punnet", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "250g", "unit": "250g", "image": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400", "base_price": 4.00},
        {"name": "Hass Avocados", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Each", "unit": "each", "image": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400", "base_price": 2.50},
        {"name": "Broccoli", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Each", "unit": "each", "image": "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400", "base_price": 3.00},
        {"name": "Carrots", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "1kg", "unit": "kg", "image": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400", "base_price": 2.00},
        {"name": "Baby Spinach", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "120g", "unit": "120g", "image": "https://images.pexels.com/photos/2325843/pexels-photo-2325843.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Roma Tomatoes", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=400", "base_price": 4.00},
        {"name": "Sweet Potato", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/89247/pexels-photo-89247.png?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Red Onions", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/4197447/pexels-photo-4197447.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Cucumbers", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Each", "unit": "each", "image": "https://images.pexels.com/photos/2329440/pexels-photo-2329440.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 1.50},
        {"name": "Grapes Red Seedless", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400", "base_price": 5.00},
        {"name": "Oranges Navel", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "1kg", "unit": "kg", "image": "https://images.unsplash.com/photo-1547514701-42782101795e?w=400", "base_price": 4.00},
        {"name": "Lemons", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Blueberries", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "125g", "unit": "125g", "image": "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400", "base_price": 5.00},
        {"name": "Watermelon", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Quarter", "unit": "quarter", "image": "https://images.pexels.com/photos/1068534/pexels-photo-1068534.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Pineapple", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Each", "unit": "each", "image": "https://images.pexels.com/photos/947879/pexels-photo-947879.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Mango", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Each", "unit": "each", "image": "https://images.pexels.com/photos/918643/pexels-photo-918643.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.00},
        {"name": "Capsicum Red", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Each", "unit": "each", "image": "https://images.pexels.com/photos/128536/pexels-photo-128536.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.00},
        {"name": "Mushrooms Cup", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "200g", "unit": "200g", "image": "https://images.pexels.com/photos/36438/mushrooms-brown-mushrooms-cook-eat.jpg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.00},
        {"name": "Lettuce Iceberg", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Each", "unit": "each", "image": "https://images.pexels.com/photos/1199562/pexels-photo-1199562.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Zucchini", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "Each", "unit": "each", "image": "https://images.pexels.com/photos/128420/pexels-photo-128420.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 1.80},
        {"name": "Garlic", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "3 Pack", "unit": "3pk", "image": "https://images.pexels.com/photos/1638522/pexels-photo-1638522.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.00},
        {"name": "Ginger", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "100g", "unit": "100g", "image": "https://images.pexels.com/photos/161556/ginger-plant-asia-rhizome-161556.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.00},
        {"name": "Potatoes", "category": "Fruit & Veg", "brand": "Fresh Produce", "size": "2kg", "unit": "2kg", "image": "https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        
        # DAIRY & EGGS (20 items)
        {"name": "Full Cream Milk", "category": "Dairy & Eggs", "brand": "Devondale", "size": "2L", "unit": "2L", "image": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400", "base_price": 3.50},
        {"name": "A2 Full Cream Milk", "category": "Dairy & Eggs", "brand": "A2", "size": "2L", "unit": "2L", "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", "base_price": 5.80},
        {"name": "Lite Milk", "category": "Dairy & Eggs", "brand": "Dairy Farmers", "size": "2L", "unit": "2L", "image": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400", "base_price": 3.30},
        {"name": "Free Range Eggs", "category": "Dairy & Eggs", "brand": "Sunny Queen", "size": "12 Pack", "unit": "12pk", "image": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400", "base_price": 6.00},
        {"name": "Cage Free Eggs", "category": "Dairy & Eggs", "brand": "Farm Pride", "size": "12 Pack", "unit": "12pk", "image": "https://images.unsplash.com/photo-1569288052389-dac9b01c9c05?w=400", "base_price": 5.00},
        {"name": "Organic Eggs", "category": "Dairy & Eggs", "brand": "Organic Valley", "size": "6 Pack", "unit": "6pk", "image": "https://images.unsplash.com/photo-1569288052389-dac9b01c9c05?w=400", "base_price": 7.50},
        {"name": "Greek Yoghurt", "category": "Dairy & Eggs", "brand": "Chobani", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400", "base_price": 5.50},
        {"name": "Natural Yoghurt", "category": "Dairy & Eggs", "brand": "Jalna", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/4397899/pexels-photo-4397899.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Tasty Cheese Block", "category": "Dairy & Eggs", "brand": "Bega", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400", "base_price": 7.00},
        {"name": "Mozzarella Cheese", "category": "Dairy & Eggs", "brand": "Perfect Italiano", "size": "450g", "unit": "450g", "image": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400", "base_price": 8.00},
        {"name": "Parmesan Cheese", "category": "Dairy & Eggs", "brand": "Perfect Italiano", "size": "250g", "unit": "250g", "image": "https://images.pexels.com/photos/4087609/pexels-photo-4087609.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 9.00},
        {"name": "Butter Salted", "category": "Dairy & Eggs", "brand": "Western Star", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400", "base_price": 6.50},
        {"name": "Thickened Cream", "category": "Dairy & Eggs", "brand": "Bulla", "size": "300ml", "unit": "300ml", "image": "https://images.pexels.com/photos/4198018/pexels-photo-4198018.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.00},
        {"name": "Sour Cream", "category": "Dairy & Eggs", "brand": "Dairy Farmers", "size": "300g", "unit": "300g", "image": "https://images.pexels.com/photos/4198018/pexels-photo-4198018.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Cream Cheese", "category": "Dairy & Eggs", "brand": "Philadelphia", "size": "250g", "unit": "250g", "image": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400", "base_price": 5.00},
        {"name": "Almond Milk", "category": "Dairy & Eggs", "brand": "Vitasoy", "size": "1L", "unit": "1L", "image": "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=400", "base_price": 3.50},
        {"name": "Oat Milk", "category": "Dairy & Eggs", "brand": "Oatly", "size": "1L", "unit": "1L", "image": "https://images.pexels.com/photos/5946081/pexels-photo-5946081.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Soy Milk", "category": "Dairy & Eggs", "brand": "Vitasoy", "size": "1L", "unit": "1L", "image": "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=400", "base_price": 3.00},
        {"name": "Coconut Milk", "category": "Dairy & Eggs", "brand": "Ayam", "size": "400ml", "unit": "400ml", "image": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", "base_price": 2.00},
        {"name": "Cottage Cheese", "category": "Dairy & Eggs", "brand": "Dairy Farmers", "size": "250g", "unit": "250g", "image": "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=400", "base_price": 4.00},
        
        # MEAT & SEAFOOD (18 items)
        {"name": "Chicken Breast", "category": "Meat & Seafood", "brand": "Lilydale", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400", "base_price": 9.00},
        {"name": "Chicken Thigh", "category": "Meat & Seafood", "brand": "Lilydale", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/6210959/pexels-photo-6210959.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 7.50},
        {"name": "Chicken Wings", "category": "Meat & Seafood", "brand": "Ingham", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 8.00},
        {"name": "Beef Mince", "category": "Meat & Seafood", "brand": "Premium", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400", "base_price": 7.00},
        {"name": "Beef Steak Scotch Fillet", "category": "Meat & Seafood", "brand": "Premium", "size": "400g", "unit": "400g", "image": "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400", "base_price": 18.00},
        {"name": "Beef Rump Steak", "category": "Meat & Seafood", "brand": "Premium", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400", "base_price": 12.00},
        {"name": "Pork Sausages", "category": "Meat & Seafood", "brand": "Don", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=400", "base_price": 6.50},
        {"name": "Pork Chops", "category": "Meat & Seafood", "brand": "Premium", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/236287/pexels-photo-236287.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 10.00},
        {"name": "Bacon Rashers", "category": "Meat & Seafood", "brand": "Don", "size": "250g", "unit": "250g", "image": "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400", "base_price": 6.00},
        {"name": "Ham Leg Sliced", "category": "Meat & Seafood", "brand": "Don", "size": "200g", "unit": "200g", "image": "https://images.pexels.com/photos/6287540/pexels-photo-6287540.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Atlantic Salmon", "category": "Meat & Seafood", "brand": "Tassal", "size": "300g", "unit": "300g", "image": "https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400", "base_price": 12.00},
        {"name": "Barramundi Fillets", "category": "Meat & Seafood", "brand": "Ocean Blue", "size": "400g", "unit": "400g", "image": "https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400", "base_price": 15.00},
        {"name": "Prawns Raw", "category": "Meat & Seafood", "brand": "Ocean Blue", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400", "base_price": 18.00},
        {"name": "Lamb Cutlets", "category": "Meat & Seafood", "brand": "Premium", "size": "400g", "unit": "400g", "image": "https://images.pexels.com/photos/618773/pexels-photo-618773.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 15.00},
        {"name": "Lamb Mince", "category": "Meat & Seafood", "brand": "Premium", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400", "base_price": 10.00},
        {"name": "Whole Chicken", "category": "Meat & Seafood", "brand": "Lilydale", "size": "1.5kg", "unit": "1.5kg", "image": "https://images.pexels.com/photos/6210959/pexels-photo-6210959.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 12.00},
        {"name": "Tuna Steaks", "category": "Meat & Seafood", "brand": "Ocean Blue", "size": "300g", "unit": "300g", "image": "https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400", "base_price": 14.00},
        {"name": "Fish Fillets Basa", "category": "Meat & Seafood", "brand": "Ocean Blue", "size": "500g", "unit": "500g", "image": "https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400", "base_price": 8.00},
        
        # BAKERY (15 items)
        {"name": "White Bread", "category": "Bakery", "brand": "Tip Top", "size": "700g", "unit": "700g", "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", "base_price": 3.50},
        {"name": "Wholemeal Bread", "category": "Bakery", "brand": "Tip Top", "size": "700g", "unit": "700g", "image": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400", "base_price": 4.00},
        {"name": "Sourdough Bread", "category": "Bakery", "brand": "Bakers Delight", "size": "680g", "unit": "680g", "image": "https://images.unsplash.com/photo-1585478259715-876acc5be8fc?w=400", "base_price": 6.00},
        {"name": "Multigrain Bread", "category": "Bakery", "brand": "Helga's", "size": "700g", "unit": "700g", "image": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400", "base_price": 4.50},
        {"name": "Croissants", "category": "Bakery", "brand": "Bakers Delight", "size": "4 Pack", "unit": "4pk", "image": "https://images.pexels.com/photos/3892469/pexels-photo-3892469.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "English Muffins", "category": "Bakery", "brand": "Tip Top", "size": "6 Pack", "unit": "6pk", "image": "https://images.pexels.com/photos/5419241/pexels-photo-5419241.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Wraps Wholemeal", "category": "Bakery", "brand": "Mission", "size": "8 Pack", "unit": "8pk", "image": "https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Pita Bread", "category": "Bakery", "brand": "Mission", "size": "6 Pack", "unit": "6pk", "image": "https://images.pexels.com/photos/1117862/pexels-photo-1117862.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Bagels", "category": "Bakery", "brand": "Tip Top", "size": "4 Pack", "unit": "4pk", "image": "https://images.pexels.com/photos/2280545/pexels-photo-2280545.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Crumpets", "category": "Bakery", "brand": "Golden", "size": "6 Pack", "unit": "6pk", "image": "https://images.pexels.com/photos/5419241/pexels-photo-5419241.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Banana Bread", "category": "Bakery", "brand": "Bakers Delight", "size": "450g", "unit": "450g", "image": "https://images.pexels.com/photos/830894/pexels-photo-830894.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.50},
        {"name": "Hot Dog Rolls", "category": "Bakery", "brand": "Tip Top", "size": "6 Pack", "unit": "6pk", "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", "base_price": 3.50},
        {"name": "Burger Buns", "category": "Bakery", "brand": "Tip Top", "size": "6 Pack", "unit": "6pk", "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", "base_price": 4.00},
        {"name": "Ciabatta Rolls", "category": "Bakery", "brand": "Bakers Delight", "size": "4 Pack", "unit": "4pk", "image": "https://images.unsplash.com/photo-1585478259715-876acc5be8fc?w=400", "base_price": 5.00},
        {"name": "Raisin Toast", "category": "Bakery", "brand": "Tip Top", "size": "520g", "unit": "520g", "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", "base_price": 5.00},
        
        # PANTRY (25 items)
        {"name": "Basmati Rice", "category": "Pantry", "brand": "SunRice", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Jasmine Rice", "category": "Pantry", "brand": "SunRice", "size": "2kg", "unit": "2kg", "image": "https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Brown Rice", "category": "Pantry", "brand": "SunRice", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Spaghetti Pasta", "category": "Pantry", "brand": "San Remo", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/1256875/pexels-photo-1256875.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Penne Pasta", "category": "Pantry", "brand": "San Remo", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/1256875/pexels-photo-1256875.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Fusilli Pasta", "category": "Pantry", "brand": "Barilla", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/1256875/pexels-photo-1256875.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.00},
        {"name": "Olive Oil Extra Virgin", "category": "Pantry", "brand": "Cobram Estate", "size": "750ml", "unit": "750ml", "image": "https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=400", "base_price": 12.00},
        {"name": "Vegetable Oil", "category": "Pantry", "brand": "Crisco", "size": "2L", "unit": "2L", "image": "https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Canned Tomatoes", "category": "Pantry", "brand": "Ardmona", "size": "400g", "unit": "400g", "image": "https://images.pexels.com/photos/5945755/pexels-photo-5945755.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 1.50},
        {"name": "Tomato Paste", "category": "Pantry", "brand": "Leggo's", "size": "140g", "unit": "140g", "image": "https://images.pexels.com/photos/5945755/pexels-photo-5945755.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 1.80},
        {"name": "Pasta Sauce Bolognese", "category": "Pantry", "brand": "Dolmio", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/5945755/pexels-photo-5945755.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Peanut Butter Smooth", "category": "Pantry", "brand": "Sanitarium", "size": "375g", "unit": "375g", "image": "https://images.pexels.com/photos/5419260/pexels-photo-5419260.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Peanut Butter Crunchy", "category": "Pantry", "brand": "Bega", "size": "375g", "unit": "375g", "image": "https://images.pexels.com/photos/5419260/pexels-photo-5419260.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Vegemite", "category": "Pantry", "brand": "Kraft", "size": "380g", "unit": "380g", "image": "https://images.pexels.com/photos/5419260/pexels-photo-5419260.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Honey", "category": "Pantry", "brand": "Capilano", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 8.00},
        {"name": "Maple Syrup", "category": "Pantry", "brand": "Queen", "size": "250ml", "unit": "250ml", "image": "https://images.pexels.com/photos/1638280/pexels-photo-1638280.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 7.00},
        {"name": "Canned Tuna", "category": "Pantry", "brand": "John West", "size": "185g", "unit": "185g", "image": "https://images.pexels.com/photos/5945755/pexels-photo-5945755.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Baked Beans", "category": "Pantry", "brand": "Heinz", "size": "420g", "unit": "420g", "image": "https://images.pexels.com/photos/5945755/pexels-photo-5945755.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Chickpeas", "category": "Pantry", "brand": "Edgell", "size": "400g", "unit": "400g", "image": "https://images.pexels.com/photos/5945755/pexels-photo-5945755.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 1.80},
        {"name": "Black Beans", "category": "Pantry", "brand": "Edgell", "size": "400g", "unit": "400g", "image": "https://images.pexels.com/photos/5945755/pexels-photo-5945755.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 1.80},
        {"name": "Sugar White", "category": "Pantry", "brand": "CSR", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/2523650/pexels-photo-2523650.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Plain Flour", "category": "Pantry", "brand": "White Wings", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/5765/flour-powder-wheat-jar.jpg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.00},
        {"name": "Self Raising Flour", "category": "Pantry", "brand": "White Wings", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/5765/flour-powder-wheat-jar.jpg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.20},
        {"name": "Rolled Oats", "category": "Pantry", "brand": "Uncle Tobys", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/543730/pexels-photo-543730.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Cornflakes", "category": "Pantry", "brand": "Kellogg's", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/543730/pexels-photo-543730.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        
        # FROZEN (15 items)
        {"name": "Frozen Peas", "category": "Frozen", "brand": "Birds Eye", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/255469/pexels-photo-255469.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Frozen Mixed Vegetables", "category": "Frozen", "brand": "Birds Eye", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/255469/pexels-photo-255469.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.00},
        {"name": "Fish Fingers", "category": "Frozen", "brand": "Birds Eye", "size": "375g", "unit": "375g", "image": "https://images.pexels.com/photos/4553111/pexels-photo-4553111.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Crumbed Fish Fillets", "category": "Frozen", "brand": "I&J", "size": "400g", "unit": "400g", "image": "https://images.pexels.com/photos/4553111/pexels-photo-4553111.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 7.00},
        {"name": "Frozen Pizza Margherita", "category": "Frozen", "brand": "McCain", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/2619970/pexels-photo-2619970.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.50},
        {"name": "Frozen Pizza Pepperoni", "category": "Frozen", "brand": "Dr Oetker", "size": "390g", "unit": "390g", "image": "https://images.pexels.com/photos/2619970/pexels-photo-2619970.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 7.50},
        {"name": "Ice Cream Vanilla", "category": "Frozen", "brand": "Streets", "size": "2L", "unit": "2L", "image": "https://images.pexels.com/photos/1352281/pexels-photo-1352281.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 7.00},
        {"name": "Ice Cream Chocolate", "category": "Frozen", "brand": "Connoisseur", "size": "1L", "unit": "1L", "image": "https://images.pexels.com/photos/1352281/pexels-photo-1352281.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 10.00},
        {"name": "Frozen Berries Mix", "category": "Frozen", "brand": "Creative Gourmet", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/1253534/pexels-photo-1253534.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Frozen Mango", "category": "Frozen", "brand": "Creative Gourmet", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/918643/pexels-photo-918643.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.50},
        {"name": "Chicken Nuggets", "category": "Frozen", "brand": "Steggles", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/6941008/pexels-photo-6941008.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 9.00},
        {"name": "Potato Chips Frozen", "category": "Frozen", "brand": "McCain", "size": "1kg", "unit": "kg", "image": "https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Hash Browns", "category": "Frozen", "brand": "McCain", "size": "700g", "unit": "700g", "image": "https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Frozen Spinach", "category": "Frozen", "brand": "Birds Eye", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/255469/pexels-photo-255469.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Ice Cream Tubs Variety", "category": "Frozen", "brand": "Peters", "size": "2L", "unit": "2L", "image": "https://images.pexels.com/photos/1352281/pexels-photo-1352281.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 8.00},
        
        # BEVERAGES (15 items)
        {"name": "Coca-Cola", "category": "Beverages", "brand": "Coca-Cola", "size": "1.25L", "unit": "1.25L", "image": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400", "base_price": 3.00},
        {"name": "Coca-Cola Zero", "category": "Beverages", "brand": "Coca-Cola", "size": "1.25L", "unit": "1.25L", "image": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400", "base_price": 3.00},
        {"name": "Pepsi", "category": "Beverages", "brand": "Pepsi", "size": "1.25L", "unit": "1.25L", "image": "https://images.pexels.com/photos/1292294/pexels-photo-1292294.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.80},
        {"name": "Orange Juice Fresh", "category": "Beverages", "brand": "Nudie", "size": "2L", "unit": "2L", "image": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400", "base_price": 6.00},
        {"name": "Apple Juice", "category": "Beverages", "brand": "Golden Circle", "size": "2L", "unit": "2L", "image": "https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Sparkling Water", "category": "Beverages", "brand": "Mount Franklin", "size": "1.25L", "unit": "1.25L", "image": "https://images.pexels.com/photos/327090/pexels-photo-327090.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Spring Water", "category": "Beverages", "brand": "Mount Franklin", "size": "1.5L", "unit": "1.5L", "image": "https://images.pexels.com/photos/327090/pexels-photo-327090.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 1.80},
        {"name": "Instant Coffee", "category": "Beverages", "brand": "Nescafe", "size": "150g", "unit": "150g", "image": "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 8.00},
        {"name": "Ground Coffee", "category": "Beverages", "brand": "Lavazza", "size": "250g", "unit": "250g", "image": "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 10.00},
        {"name": "Tea Bags English Breakfast", "category": "Beverages", "brand": "Twinings", "size": "100pk", "unit": "100pk", "image": "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.50},
        {"name": "Green Tea Bags", "category": "Beverages", "brand": "Lipton", "size": "50pk", "unit": "50pk", "image": "https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Energy Drink", "category": "Beverages", "brand": "Red Bull", "size": "250ml", "unit": "250ml", "image": "https://images.pexels.com/photos/3323682/pexels-photo-3323682.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Sports Drink", "category": "Beverages", "brand": "Gatorade", "size": "600ml", "unit": "600ml", "image": "https://images.pexels.com/photos/3323682/pexels-photo-3323682.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.00},
        {"name": "Coconut Water", "category": "Beverages", "brand": "H2coco", "size": "1L", "unit": "1L", "image": "https://images.pexels.com/photos/1030973/pexels-photo-1030973.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Iced Coffee", "category": "Beverages", "brand": "Dare", "size": "500ml", "unit": "500ml", "image": "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        
        # SNACKS (18 items)
        {"name": "Tim Tams Original", "category": "Snacks", "brand": "Arnott's", "size": "200g", "unit": "200g", "image": "https://images.pexels.com/photos/4110008/pexels-photo-4110008.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Tim Tams Double Coat", "category": "Snacks", "brand": "Arnott's", "size": "200g", "unit": "200g", "image": "https://images.pexels.com/photos/4110008/pexels-photo-4110008.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Chips Original Salted", "category": "Snacks", "brand": "Smith's", "size": "170g", "unit": "170g", "image": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400", "base_price": 4.50},
        {"name": "Chips Salt & Vinegar", "category": "Snacks", "brand": "Kettle", "size": "175g", "unit": "175g", "image": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400", "base_price": 5.00},
        {"name": "Chips BBQ", "category": "Snacks", "brand": "Red Rock Deli", "size": "165g", "unit": "165g", "image": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400", "base_price": 5.50},
        {"name": "Chocolate Block Dairy Milk", "category": "Snacks", "brand": "Cadbury", "size": "180g", "unit": "180g", "image": "https://images.pexels.com/photos/65882/chocolate-dark-coffee-confiserie-65882.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Chocolate Block Dark", "category": "Snacks", "brand": "Lindt", "size": "100g", "unit": "100g", "image": "https://images.pexels.com/photos/65882/chocolate-dark-coffee-confiserie-65882.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.50},
        {"name": "Mixed Nuts Unsalted", "category": "Snacks", "brand": "Coles", "size": "375g", "unit": "375g", "image": "https://images.pexels.com/photos/1295572/pexels-photo-1295572.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 8.00},
        {"name": "Almonds Natural", "category": "Snacks", "brand": "Blue Diamond", "size": "400g", "unit": "400g", "image": "https://images.pexels.com/photos/1013420/pexels-photo-1013420.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 10.00},
        {"name": "Granola Bars", "category": "Snacks", "brand": "Carman's", "size": "6pk", "unit": "6pk", "image": "https://images.pexels.com/photos/8844888/pexels-photo-8844888.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.50},
        {"name": "Popcorn Sea Salt", "category": "Snacks", "brand": "Cobs", "size": "120g", "unit": "120g", "image": "https://images.pexels.com/photos/33129/popcorn-movie-party-entertainment.jpg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.50},
        {"name": "Rice Crackers", "category": "Snacks", "brand": "Sakata", "size": "100g", "unit": "100g", "image": "https://images.pexels.com/photos/5419260/pexels-photo-5419260.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 3.00},
        {"name": "Pretzels", "category": "Snacks", "brand": "Newman's", "size": "227g", "unit": "227g", "image": "https://images.pexels.com/photos/5419260/pexels-photo-5419260.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Dried Mango", "category": "Snacks", "brand": "Macro", "size": "150g", "unit": "150g", "image": "https://images.pexels.com/photos/918643/pexels-photo-918643.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Trail Mix", "category": "Snacks", "brand": "Coles", "size": "500g", "unit": "500g", "image": "https://images.pexels.com/photos/1295572/pexels-photo-1295572.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 7.00},
        {"name": "Beef Jerky", "category": "Snacks", "brand": "Jack Links", "size": "50g", "unit": "50g", "image": "https://images.pexels.com/photos/65175/pexels-photo-65175.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Corn Chips", "category": "Snacks", "brand": "Doritos", "size": "170g", "unit": "170g", "image": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400", "base_price": 4.50},
        {"name": "Biscuits Chocolate", "category": "Snacks", "brand": "Arnott's", "size": "250g", "unit": "250g", "image": "https://images.pexels.com/photos/4110008/pexels-photo-4110008.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        
        # HOUSEHOLD (12 items)
        {"name": "Toilet Paper", "category": "Household", "brand": "Quilton", "size": "12pk", "unit": "12pk", "image": "https://images.pexels.com/photos/3958212/pexels-photo-3958212.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 8.00},
        {"name": "Paper Towels", "category": "Household", "brand": "Viva", "size": "3pk", "unit": "3pk", "image": "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Dish Washing Liquid", "category": "Household", "brand": "Morning Fresh", "size": "900ml", "unit": "900ml", "image": "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "Laundry Powder", "category": "Household", "brand": "OMO", "size": "2kg", "unit": "2kg", "image": "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 12.00},
        {"name": "Laundry Liquid", "category": "Household", "brand": "Cold Power", "size": "2L", "unit": "2L", "image": "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 14.00},
        {"name": "Fabric Softener", "category": "Household", "brand": "Comfort", "size": "2L", "unit": "2L", "image": "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Garbage Bags Large", "category": "Household", "brand": "Glad", "size": "20pk", "unit": "20pk", "image": "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Cling Wrap", "category": "Household", "brand": "Glad", "size": "150m", "unit": "150m", "image": "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Aluminium Foil", "category": "Household", "brand": "Alfoil", "size": "30m", "unit": "30m", "image": "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.50},
        {"name": "All Purpose Cleaner", "category": "Household", "brand": "Ajax", "size": "750ml", "unit": "750ml", "image": "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Sponges", "category": "Household", "brand": "Chux", "size": "5pk", "unit": "5pk", "image": "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Dishwasher Tablets", "category": "Household", "brand": "Finish", "size": "30pk", "unit": "30pk", "image": "https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 15.00},
        
        # PERSONAL CARE (12 items)
        {"name": "Shampoo", "category": "Personal Care", "brand": "Pantene", "size": "350ml", "unit": "350ml", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 7.00},
        {"name": "Conditioner", "category": "Personal Care", "brand": "Pantene", "size": "350ml", "unit": "350ml", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 7.00},
        {"name": "Body Wash", "category": "Personal Care", "brand": "Dove", "size": "400ml", "unit": "400ml", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Soap Bar", "category": "Personal Care", "brand": "Dove", "size": "4pk", "unit": "4pk", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Toothpaste", "category": "Personal Care", "brand": "Colgate", "size": "175g", "unit": "175g", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 4.00},
        {"name": "Toothbrush", "category": "Personal Care", "brand": "Oral B", "size": "2pk", "unit": "2pk", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Deodorant", "category": "Personal Care", "brand": "Rexona", "size": "150ml", "unit": "150ml", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 5.00},
        {"name": "Razor", "category": "Personal Care", "brand": "Gillette", "size": "4pk", "unit": "4pk", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 15.00},
        {"name": "Tissues", "category": "Personal Care", "brand": "Kleenex", "size": "95pk", "unit": "95pk", "image": "https://images.pexels.com/photos/4239013/pexels-photo-4239013.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 2.50},
        {"name": "Hand Sanitiser", "category": "Personal Care", "brand": "Dettol", "size": "500ml", "unit": "500ml", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 6.00},
        {"name": "Sunscreen SPF50", "category": "Personal Care", "brand": "Cancer Council", "size": "200ml", "unit": "200ml", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 12.00},
        {"name": "Face Wash", "category": "Personal Care", "brand": "Cetaphil", "size": "250ml", "unit": "250ml", "image": "https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=400", "base_price": 10.00},
    ]
    
    result = []
    for idx, product in enumerate(products):
        product_id = str(uuid.uuid4())
        base = product["base_price"]
        
        store_prices = {}
        for store_key in STORES.keys():
            variation = random.uniform(0.80, 1.30)
            price = round(base * variation, 2)
            
            if store_key == "aldi":
                price = round(price * 0.90, 2)
            elif store_key == "costco":
                price = round(price * 0.85, 2)
            elif store_key == "iga":
                price = round(price * 1.05, 2)
                
            store_prices[store_key] = {
                "price": price,
                "available": random.random() > 0.1,
                "on_special": random.random() < 0.2
            }
        
        # Generate price history
        price_history = generate_price_history(base, 30)
        
        result.append({
            "id": product_id,
            "name": product["name"],
            "category": product["category"],
            "brand": product["brand"],
            "size": product["size"],
            "unit": product["unit"],
            "image": product["image"],
            "store_prices": store_prices,
            "price_history": price_history,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "source": "mock"
        })
    
    return result

MOCK_PRODUCTS = generate_mock_products()

# ============================================
# PYDANTIC MODELS
# ============================================

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    category: str
    brand: str
    size: str
    unit: str
    image: str
    store_prices: Dict[str, Any]
    price_history: Optional[List[Dict]] = None
    created_at: str
    source: Optional[str] = "mock"

class ProductResponse(BaseModel):
    products: List[Product]
    total: int
    page: int
    page_size: int
    source: str = "mock"

class SearchSuggestion(BaseModel):
    id: str
    name: str
    category: str
    brand: str

class StoreInfo(BaseModel):
    key: str
    name: str
    color: str
    logo: str

class PriceAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    target_price: float
    current_best_price: float
    email: Optional[str] = None
    triggered: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PriceAlertCreate(BaseModel):
    product_id: str
    product_name: str
    target_price: float
    current_best_price: float
    email: Optional[EmailStr] = None

class ShoppingListItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    product_image: str
    quantity: int = 1
    store_prices: Dict[str, Any] = {}
    added_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShoppingList(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "My Shopping List"
    items: List[ShoppingListItem] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ShoppingListItemAdd(BaseModel):
    product_id: str
    product_name: str
    product_image: str
    quantity: int = 1
    store_prices: Dict[str, Any] = {}

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]

class ApiUsageResponse(BaseModel):
    calls_made: int
    monthly_limit: int
    remaining: int
    percentage_used: float

# ============================================
# API ENDPOINTS
# ============================================

@api_router.get("/")
async def root():
    return {
        "message": "PricePantry API", 
        "version": "4.0.0", 
        "features": [
            "Price comparison across 5 stores",
            "Web scraping for Coles/Woolworths",
            "Email notifications via Resend",
            "Shopping lists with store totals",
            "Price history charts (30 days)",
            "Push notifications support",
            f"{len(MOCK_PRODUCTS)} products"
        ]
    }

@api_router.get("/api-usage", response_model=ApiUsageResponse)
async def get_api_usage():
    remaining = max(0, api_usage["monthly_limit"] - api_usage["calls_made"])
    percentage = (api_usage["calls_made"] / api_usage["monthly_limit"]) * 100
    return ApiUsageResponse(
        calls_made=api_usage["calls_made"],
        monthly_limit=api_usage["monthly_limit"],
        remaining=remaining,
        percentage_used=round(percentage, 1)
    )

@api_router.get("/stores", response_model=List[StoreInfo])
async def get_stores():
    return [StoreInfo(key=key, name=info["name"], color=info["color"], logo=info["logo"]) for key, info in STORES.items()]

@api_router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES}

@api_router.get("/products/search", response_model=ProductResponse)
async def search_products(
    q: str = Query("", description="Search query"),
    category: Optional[str] = Query(None),
    store: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    sort_by: str = Query("best_price"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    source = "mock"
    filtered = MOCK_PRODUCTS.copy()
    
    if q:
        q_lower = q.lower()
        filtered = [p for p in filtered if q_lower in p["name"].lower() or q_lower in p.get("brand", "").lower()]
    
    if category:
        filtered = [p for p in filtered if p.get("category") == category]
    
    if store and store in STORES:
        filtered = [p for p in filtered if p.get("store_prices", {}).get(store, {}).get("available", False)]
    
    if min_price is not None or max_price is not None:
        def get_best_price(p):
            prices = [sp["price"] for sp in p.get("store_prices", {}).values() if sp.get("available") and sp.get("price", 0) > 0]
            return min(prices) if prices else float('inf')
        
        if min_price is not None:
            filtered = [p for p in filtered if get_best_price(p) >= min_price]
        if max_price is not None:
            filtered = [p for p in filtered if get_best_price(p) <= max_price]
    
    if sort_by == "best_price":
        def get_best_price(p):
            prices = [sp["price"] for sp in p.get("store_prices", {}).values() if sp.get("available") and sp.get("price", 0) > 0]
            return min(prices) if prices else float('inf')
        filtered.sort(key=get_best_price)
    elif sort_by == "name":
        filtered.sort(key=lambda p: p.get("name", "").lower())
    
    total = len(filtered)
    start = (page - 1) * page_size
    paginated = filtered[start:start + page_size]
    
    return ProductResponse(products=paginated, total=total, page=page, page_size=page_size, source=source)

@api_router.get("/products/suggestions")
async def get_suggestions(q: str = Query(..., min_length=1)):
    q_lower = q.lower()
    suggestions = []
    seen = set()
    
    for p in MOCK_PRODUCTS:
        if q_lower in p["name"].lower() and p["name"] not in seen:
            suggestions.append(SearchSuggestion(id=p["id"], name=p["name"], category=p["category"], brand=p["brand"]))
            seen.add(p["name"])
            if len(suggestions) >= 8:
                break
    
    return {"suggestions": suggestions}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    for p in MOCK_PRODUCTS:
        if p["id"] == product_id:
            return p
    raise HTTPException(status_code=404, detail="Product not found")

@api_router.get("/products/{product_id}/history")
async def get_product_history(product_id: str):
    """Get price history for a product"""
    for p in MOCK_PRODUCTS:
        if p["id"] == product_id:
            return {
                "product_id": product_id,
                "product_name": p["name"],
                "history": p.get("price_history", [])
            }
    raise HTTPException(status_code=404, detail="Product not found")

@api_router.get("/products/category/{category}")
async def get_products_by_category(category: str, limit: int = Query(10, ge=1, le=50)):
    products = [p for p in MOCK_PRODUCTS if p["category"] == category][:limit]
    return {"products": products, "category": category}

@api_router.get("/specials")
async def get_specials(limit: int = Query(12, ge=1, le=50)):
    specials = [p for p in MOCK_PRODUCTS if any(sp.get("on_special") for sp in p["store_prices"].values())][:limit]
    return {"products": specials}

# Price Alerts
@api_router.post("/alerts", response_model=PriceAlert)
async def create_price_alert(alert: PriceAlertCreate, background_tasks: BackgroundTasks):
    alert_obj = PriceAlert(**alert.model_dump())
    doc = alert_obj.model_dump()
    await db.price_alerts.insert_one(doc)
    background_tasks.add_task(check_price_alerts_and_notify)
    return alert_obj

@api_router.get("/alerts", response_model=List[PriceAlert])
async def get_price_alerts(product_id: Optional[str] = None):
    query = {"product_id": product_id} if product_id else {}
    alerts = await db.price_alerts.find(query, {"_id": 0}).to_list(100)
    return alerts

@api_router.delete("/alerts/{alert_id}")
async def delete_price_alert(alert_id: str):
    result = await db.price_alerts.delete_one({"id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted", "id": alert_id}

# Shopping Lists
@api_router.post("/shopping-lists", response_model=ShoppingList)
async def create_shopping_list(name: str = "My Shopping List"):
    shopping_list = ShoppingList(name=name)
    doc = shopping_list.model_dump()
    await db.shopping_lists.insert_one(doc)
    return shopping_list

@api_router.get("/shopping-lists", response_model=List[ShoppingList])
async def get_shopping_lists():
    lists = await db.shopping_lists.find({}, {"_id": 0}).to_list(50)
    return lists

@api_router.get("/shopping-lists/{list_id}", response_model=ShoppingList)
async def get_shopping_list(list_id: str):
    shopping_list = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return shopping_list

@api_router.post("/shopping-lists/{list_id}/items", response_model=ShoppingList)
async def add_item_to_list(list_id: str, item: ShoppingListItemAdd):
    shopping_list = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    
    new_item = ShoppingListItem(**item.model_dump())
    
    await db.shopping_lists.update_one(
        {"id": list_id},
        {
            "$push": {"items": new_item.model_dump()},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    updated_list = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
    return updated_list

@api_router.put("/shopping-lists/{list_id}/items/{item_id}")
async def update_item_quantity(list_id: str, item_id: str, quantity: int = Query(..., ge=1)):
    result = await db.shopping_lists.update_one(
        {"id": list_id, "items.id": item_id},
        {
            "$set": {
                "items.$.quantity": quantity,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Quantity updated"}

@api_router.delete("/shopping-lists/{list_id}/items/{item_id}")
async def remove_item_from_list(list_id: str, item_id: str):
    result = await db.shopping_lists.update_one(
        {"id": list_id},
        {
            "$pull": {"items": {"id": item_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item removed"}

@api_router.delete("/shopping-lists/{list_id}")
async def delete_shopping_list(list_id: str):
    result = await db.shopping_lists.delete_one({"id": list_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    return {"message": "Shopping list deleted"}

@api_router.get("/shopping-lists/{list_id}/totals")
async def get_shopping_list_totals(list_id: str):
    shopping_list = await db.shopping_lists.find_one({"id": list_id}, {"_id": 0})
    if not shopping_list:
        raise HTTPException(status_code=404, detail="Shopping list not found")
    
    store_totals = {store: 0.0 for store in STORES.keys()}
    
    for item in shopping_list.get("items", []):
        quantity = item.get("quantity", 1)
        for store, price_data in item.get("store_prices", {}).items():
            if store in store_totals and price_data.get("available") and price_data.get("price"):
                store_totals[store] += price_data["price"] * quantity
    
    available_stores = {k: v for k, v in store_totals.items() if v > 0}
    cheapest_store = min(available_stores, key=available_stores.get) if available_stores else None
    
    return {
        "list_id": list_id,
        "item_count": len(shopping_list.get("items", [])),
        "store_totals": {k: round(v, 2) for k, v in store_totals.items()},
        "cheapest_store": cheapest_store,
        "cheapest_total": round(store_totals.get(cheapest_store, 0), 2) if cheapest_store else 0
    }

# Push Notifications
@api_router.post("/push/subscribe")
async def subscribe_push(subscription: PushSubscription):
    """Save push subscription to database"""
    doc = {
        "id": str(uuid.uuid4()),
        "endpoint": subscription.endpoint,
        "keys": subscription.keys,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.push_subscriptions.insert_one(doc)
    return {"message": "Subscription saved", "id": doc["id"]}

@api_router.delete("/push/unsubscribe")
async def unsubscribe_push(endpoint: str):
    """Remove push subscription"""
    await db.push_subscriptions.delete_one({"endpoint": endpoint})
    return {"message": "Unsubscribed"}

# Scraping endpoint
@api_router.get("/scrape/{query}")
async def scrape_prices(query: str):
    results = await scrape_all_stores(query)
    return {
        "query": query,
        "results": results,
        "total_coles": len(results.get("coles", [])),
        "total_woolworths": len(results.get("woolworths", []))
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
