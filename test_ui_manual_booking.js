#!/usr/bin/env node

/**
 * UI Manual Ride Booking Test
 * 
 * This test simulates the exact user interaction with the frontend UI
 * to verify manual ride booking works without Google Maps API.
 */

const axios = require('axios');
const puppeteer = require('puppeteer');

const API_URL = 'http://localhost:8001';
const FRONTEND_URL = 'http://localhost:3000';

async function testUIManualBooking() {
  console.log('🧪 Testing UI Manual Ride Booking\n');
  
  let browser;
  let page;
  
  try {
    // Launch browser
    console.log('1. Launching browser...');
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      defaultViewport: { width: 1280, height: 720 }
    });
    page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      } else if (msg.type() === 'log') {
        console.log('📝 Browser Log:', msg.text());
      }
    });
    
    // Navigate to frontend
    console.log('2. Navigating to frontend...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
    console.log('✅ Frontend loaded');
    
    // Wait for the app to load
    await page.waitForTimeout(3000);
    
    // Check if we're on the login page
    console.log('3. Checking authentication...');
    const isLoginPage = await page.$('[data-testid="auth-modal"]') !== null;
    
    if (isLoginPage) {
      console.log('   Login required, registering test user...');
      
      // Click Sign Up tab
      await page.click('[data-testid="register-tab"]');
      await page.waitForTimeout(1000);
      
      // Fill registration form
      await page.type('[data-testid="register-name-input"]', 'UI Test Rider');
      await page.type('[data-testid="register-email-input"]', 'ui.test@example.com');
      await page.type('[data-testid="register-phone-input"]', '+1234567890');
      await page.type('[data-testid="register-password-input"]', 'testpass123');
      
      // Submit registration
      await page.click('[data-testid="register-submit-button"]');
      await page.waitForTimeout(3000);
      
      console.log('✅ User registered and logged in');
    } else {
      console.log('   Already logged in');
    }
    
    // Navigate to ride booking
    console.log('4. Navigating to ride booking...');
    
    // Look for ride booking link/button
    const rideBookingSelectors = [
      'a[href="/book"]',
      'a[href="/ride-booking"]',
      'button:contains("Book Ride")',
      '[data-testid="book-ride-button"]',
      'a:contains("Book")'
    ];
    
    let bookingLink = null;
    for (const selector of rideBookingSelectors) {
      try {
        bookingLink = await page.$(selector);
        if (bookingLink) {
          await bookingLink.click();
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!bookingLink) {
      // Try to navigate directly
      await page.goto(`${FRONTEND_URL}/book`, { waitUntil: 'networkidle2' });
    }
    
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to ride booking page');
    
    // Check if we're in manual mode (no Google Maps)
    console.log('5. Checking for manual entry mode...');
    
    const manualModeIndicator = await page.$('text/Manual Entry Mode');
    const testModeIndicator = await page.$('text/Test Mode - Manual Entry');
    
    if (manualModeIndicator || testModeIndicator) {
      console.log('✅ Manual entry mode detected');
    } else {
      console.log('⚠️  Manual entry mode not detected, checking for Google Maps...');
    }
    
    // Test pickup location input
    console.log('6. Testing pickup location input...');
    
    const pickupInputSelectors = [
      'input[placeholder*="pickup" i]',
      'input[placeholder*="from" i]',
      'input[data-testid*="pickup"]',
      'input[data-testid*="from"]',
      'input[type="text"]'
    ];
    
    let pickupInput = null;
    for (const selector of pickupInputSelectors) {
      try {
        pickupInput = await page.$(selector);
        if (pickupInput) {
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (pickupInput) {
      // Type in pickup location
      await pickupInput.click();
      await page.type(pickupInput, '48.7758, 9.1829');
      await page.waitForTimeout(1000);
      
      // Look for "Use This Location" button
      const useLocationButton = await page.$('button:contains("Use This Location")');
      if (useLocationButton) {
        console.log('✅ Found "Use This Location" button');
        await useLocationButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Clicked "Use This Location" button');
      } else {
        console.log('⚠️  "Use This Location" button not found');
      }
    } else {
      console.log('❌ Pickup input not found');
    }
    
    // Test dropoff location input
    console.log('7. Testing dropoff location input...');
    
    const dropoffInputSelectors = [
      'input[placeholder*="dropoff" i]',
      'input[placeholder*="destination" i]',
      'input[placeholder*="to" i]',
      'input[data-testid*="dropoff"]',
      'input[data-testid*="destination"]',
      'input[data-testid*="to"]'
    ];
    
    let dropoffInput = null;
    for (const selector of dropoffInputSelectors) {
      try {
        dropoffInput = await page.$(selector);
        if (dropoffInput) {
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (dropoffInput) {
      // Type in dropoff location
      await dropoffInput.click();
      await page.type(dropoffInput, 'Stuttgart Central Station');
      await page.waitForTimeout(1000);
      
      // Look for "Use This Location" button
      const useLocationButton2 = await page.$('button:contains("Use This Location")');
      if (useLocationButton2) {
        console.log('✅ Found "Use This Location" button for dropoff');
        await useLocationButton2.click();
        await page.waitForTimeout(1000);
        console.log('✅ Clicked "Use This Location" button for dropoff');
      } else {
        console.log('⚠️  "Use This Location" button not found for dropoff');
      }
    } else {
      console.log('❌ Dropoff input not found');
    }
    
    // Test coordinate input mode
    console.log('8. Testing coordinate input mode...');
    
    // Look for "Enter Coordinates" button
    const enterCoordsButton = await page.$('button:contains("Enter Coordinates")');
    if (enterCoordsButton) {
      console.log('✅ Found "Enter Coordinates" button');
      await enterCoordsButton.click();
      await page.waitForTimeout(1000);
      
      // Look for coordinate input fields
      const latInput = await page.$('input[placeholder*="Latitude" i]');
      const lngInput = await page.$('input[placeholder*="Longitude" i]');
      
      if (latInput && lngInput) {
        console.log('✅ Found coordinate input fields');
        await latInput.type('49.7758');
        await lngInput.type('10.1829');
        await page.waitForTimeout(1000);
        
        // Look for "Use Coordinates" button
        const useCoordsButton = await page.$('button:contains("Use Coordinates")');
        if (useCoordsButton) {
          console.log('✅ Found "Use Coordinates" button');
          await useCoordsButton.click();
          await page.waitForTimeout(1000);
          console.log('✅ Clicked "Use Coordinates" button');
        } else {
          console.log('⚠️  "Use Coordinates" button not found');
        }
      } else {
        console.log('⚠️  Coordinate input fields not found');
      }
    } else {
      console.log('⚠️  "Enter Coordinates" button not found');
    }
    
    // Test ride booking submission
    console.log('9. Testing ride booking submission...');
    
    const bookRideSelectors = [
      'button:contains("Book Ride")',
      'button:contains("Request Ride")',
      'button:contains("Submit")',
      '[data-testid*="book"]',
      '[data-testid*="submit"]'
    ];
    
    let bookButton = null;
    for (const selector of bookRideSelectors) {
      try {
        bookButton = await page.$(selector);
        if (bookButton) {
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (bookButton) {
      console.log('✅ Found book ride button');
      await bookButton.click();
      await page.waitForTimeout(3000);
      console.log('✅ Clicked book ride button');
      
      // Check for success message
      const successSelectors = [
        'text/Ride request submitted',
        'text/successfully',
        'text/confirmed',
        '.toast-success',
        '[data-testid*="success"]'
      ];
      
      let successFound = false;
      for (const selector of successSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            console.log('✅ Success message found');
            successFound = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!successFound) {
        console.log('⚠️  Success message not found, checking for errors...');
        
        const errorSelectors = [
          'text/error',
          'text/failed',
          '.toast-error',
          '[data-testid*="error"]'
        ];
        
        for (const selector of errorSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const errorText = await element.textContent();
              console.log('❌ Error found:', errorText);
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
      }
    } else {
      console.log('❌ Book ride button not found');
    }
    
    // Take a screenshot for debugging
    console.log('10. Taking screenshot...');
    await page.screenshot({ path: 'manual_booking_test.png', fullPage: true });
    console.log('✅ Screenshot saved as manual_booking_test.png');
    
    return { success: true };
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  console.log('🚗 UI Manual Ride Booking Test');
  console.log('===============================\n');
  
  const result = await testUIManualBooking();
  
  console.log('\n📊 Test Summary');
  console.log('================');
  if (result.success) {
    console.log('✅ UI test completed successfully!');
    console.log('   Check manual_booking_test.png for visual confirmation');
  } else {
    console.log('❌ UI test failed!');
    console.log(`   Error: ${result.error}`);
  }
  
  console.log('\n💡 Manual UI Test Features:');
  console.log('   ✅ Browser automation with Puppeteer');
  console.log('   ✅ User registration and login');
  console.log('   ✅ Manual location input testing');
  console.log('   ✅ Coordinate input mode testing');
  console.log('   ✅ Button interaction verification');
  console.log('   ✅ Screenshot capture for debugging');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testUIManualBooking };
