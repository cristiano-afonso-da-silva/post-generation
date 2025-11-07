# Create Test Mode Products in Stripe

Follow these steps to create the 4 subscription products in Stripe **test mode**:

## Step 1: Go to Stripe Test Mode Dashboard

1. Open https://dashboard.stripe.com/test/products
2. Make sure you see "Test mode" in the top right corner (toggle should be ON)

## Step 2: Create Each Product

Create these 4 products one by one:

### Product 1: Basic Plan

1. Click **"+ Add product"** button
2. Fill in:
   - **Name**: `Basic Plan`
   - **Description**: `10 credits per month - For exploring AI-generated content`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `$10.00`
   - **Billing period**: `Monthly`
   - **Currency**: `USD`
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_`) - you'll need this!

### Product 2: Pro Plan

1. Click **"+ Add product"** button
2. Fill in:
   - **Name**: `Pro Plan`
   - **Description**: `20 credits per month - For professionals building consistency`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `$20.00`
   - **Billing period**: `Monthly`
   - **Currency**: `USD`
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_`) - you'll need this!

### Product 3: Business Plan

1. Click **"+ Add product"** button
2. Fill in:
   - **Name**: `Business Plan`
   - **Description**: `50 credits per month - For teams growing their brand presence`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `$50.00`
   - **Billing period**: `Monthly`
   - **Currency**: `USD`
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_`) - you'll need this!

### Product 4: Enterprise Plan

1. Click **"+ Add product"** button
2. Fill in:
   - **Name**: `Enterprise Plan`
   - **Description**: `100 credits per month - For agencies producing at scale`
   - **Pricing model**: Select **"Recurring"**
   - **Price**: `$100.00`
   - **Billing period**: `Monthly`
   - **Currency**: `USD`
3. Click **"Save product"**
4. **Copy the Price ID** (starts with `price_`) - you'll need this!

## Step 3: Get Product IDs

For each product you created:

1. Click on the product name
2. Look at the URL or product details
3. **Copy the Product ID** (starts with `prod_`) - you'll need this too!

## Step 4: Update Your Config

After creating all 4 products, you'll have:

- 4 Price IDs (one for each product)
- 4 Product IDs (one for each product)

Share these IDs with me and I'll update your `stripeConfig.ts` file with the correct test mode IDs.

## Quick Reference - What You Need

After creating all products, you should have:

| Plan                         | Price ID    | Product ID |
| ---------------------------- | ----------- | ---------- |
| Basic Plan ($10/month)       | `price_...` | `prod_...` |
| Pro Plan ($20/month)         | `price_...` | `prod_...` |
| Business Plan ($50/month)    | `price_...` | `prod_...` |
| Enterprise Plan ($100/month) | `price_...` | `prod_...` |

**Note**: The Price ID and Product ID will be different for test mode vs live mode. Make sure you're copying from the **test mode** dashboard!
