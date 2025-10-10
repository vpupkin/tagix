# 🚗 Complete Rider Flow Documentation

## Overview
This document provides a comprehensive explanation of the complete rider journey in the MobilityHub application, from initial registration to ride completion and payment.

## 📋 Table of Contents
1. [Registration & Authentication](#1-registration--authentication)
2. [Ride Booking Process](#2-ride-booking-process)
3. [Driver Matching & Acceptance](#3-driver-matching--acceptance)
4. [Driver Arrival & Pickup](#4-driver-arrival--pickup)
5. [Ride Execution](#5-ride-execution)
6. [Payment Processing](#6-payment-processing)
7. [Rating & Feedback](#7-rating--feedback)
8. [Alternative Flows](#8-alternative-flows)

---

## 1. Registration & Authentication

### 1.1 User Registration
- **Entry Point**: User opens the application
- **Component**: `AuthModal.js`
- **Process**:
  1. User clicks "Sign Up" tab
  2. Fills registration form:
     - Full Name
     - Email address
     - Phone number
     - Password (minimum 6 characters)
     - Role selection: "Rider"
  3. Submits form via `POST /api/auth/register`
  4. Backend creates user record in database
  5. User is redirected to dashboard

### 1.2 Authentication
- **Component**: `AuthModal.js`
- **Process**:
  1. User enters email and password
  2. Submits via `POST /api/auth/login`
  3. Backend validates credentials
  4. JWT token issued and stored
  5. User redirected to appropriate dashboard

---

## 2. Ride Booking Process

### 2.1 Location Selection
- **Component**: `RideBooking.js`
- **Step 1 - Pickup Location**:
  - User's current location detected via geolocation
  - Map displays with current location marker
  - User can:
    - Click on map to select pickup point
    - Use address search/autocomplete
    - Enter coordinates manually
  - Pickup marker updates on map

- **Step 2 - Dropoff Location**:
  - User selects destination using same methods
  - Dropoff marker appears on map
  - Route line drawn between pickup and dropoff
  - Distance calculated automatically

### 2.2 Ride Configuration
- **Vehicle Type Selection**:
  - Economy (base fare)
  - Comfort (premium pricing)
  - Premium (highest pricing)
  
- **Additional Options**:
  - Passenger count (1-6)
  - Special requirements (wheelchair accessible, child seat, etc.)
  - Fare automatically recalculated based on selections

### 2.3 Fare Calculation
- **Formula**: `Base fare + (Distance × Rate per km) + Vehicle type multiplier`
- **Display**: Real-time fare updates as user changes options
- **Currency**: ⓉaxiCoin (Ⓣ) symbol used throughout

### 2.4 Request Submission
- **Process**:
  1. User reviews all details
  2. Clicks "Book Ride" button
  3. Frontend sends `POST /api/rides/request` with:
     ```json
     {
       "pickup_location": {
         "latitude": 37.7749,
         "longitude": -122.4194,
         "address": "123 Main St, San Francisco, CA"
       },
       "dropoff_location": {
         "latitude": 37.7849,
         "longitude": -122.4094,
         "address": "456 Oak Ave, San Francisco, CA"
       },
       "vehicle_type": "economy",
       "passenger_count": 1,
       "special_requirements": null
     }
     ```
  4. Backend creates ride request record
  5. System searches for nearby drivers
  6. Notifications sent to top 5 closest drivers
  7. User redirected to rides page

---

## 3. Driver Matching & Acceptance

### 3.1 Driver Search Algorithm
- **Radius**: 100km maximum search radius
- **Criteria**:
  - Driver status: "online"
  - Within radius of pickup location
  - Available for new rides
  - Sorted by distance and rating

### 3.2 Driver Notifications
- **Method**: WebSocket real-time notifications
- **Content**:
  ```json
  {
    "type": "ride_request",
    "request_id": "uuid",
    "pickup_address": "123 Main St",
    "dropoff_address": "456 Oak Ave",
    "estimated_fare": 25.50,
    "distance_km": 5.2,
    "vehicle_type": "economy"
  }
  ```

### 3.3 Driver Acceptance
- **Process**:
  1. Driver reviews ride details
  2. Clicks "Accept" button
  3. Backend receives `POST /api/rides/{request_id}/accept`
  4. System creates ride match record
  5. Updates ride request status to "accepted"
  6. Rider receives notification:
     ```json
     {
       "type": "ride_accepted",
       "match_id": "uuid",
       "driver_name": "John Smith",
       "driver_rating": 4.8,
       "estimated_arrival": "5 minutes"
     }
     ```

---

## 4. Driver Arrival & Pickup

### 4.1 Driver Navigation
- Driver uses GPS navigation to reach pickup location
- Real-time location updates sent to rider
- ETA calculations updated dynamically

### 4.2 Arrival Confirmation
- **Process**:
  1. Driver arrives at pickup location
  2. Clicks "I've Arrived" button
  3. Backend receives `POST /api/rides/{match_id}/arrived`
  4. Ride status updated to "driver_arriving"
  5. Rider receives notification:
     ```json
     {
       "type": "driver_arrived",
       "match_id": "uuid",
       "message": "Driver has arrived at pickup location"
     }
     ```

### 4.3 Pickup Process
- Rider can see driver's exact location on map
- Contact options available (call, message)
- Driver waits for rider to board vehicle

---

## 5. Ride Execution

### 5.1 Ride Start
- **Process**:
  1. Rider boards vehicle
  2. Driver clicks "Start Ride" button
  3. Backend receives `POST /api/rides/{match_id}/start`
  4. Ride status updated to "in_progress"
  5. Start timestamp recorded
  6. Rider receives notification:
     ```json
     {
       "type": "ride_started",
       "match_id": "uuid",
       "driver_name": "John Smith",
       "message": "Your ride has started! Enjoy your journey."
     }
     ```

### 5.2 Real-time Tracking
- **Features**:
  - Live driver location updates
  - Route visualization on map
  - Estimated time to destination
  - Distance remaining
  - Current speed and traffic conditions

### 5.3 Communication
- **Options**:
  - In-app messaging with driver
  - Voice call integration
  - Emergency contact features

---

## 6. Payment Processing

### 6.1 Ride Completion
- **Process**:
  1. Driver reaches destination
  2. Clicks "Complete Ride" button
  3. Backend receives `POST /api/rides/{match_id}/complete`
  4. Ride status updated to "completed"
  5. Completion timestamp recorded
  6. Payment record created automatically

### 6.2 Payment Calculation
- **Components**:
  - Base fare: Ⓣ15.00
  - Distance rate: Ⓣ2.50 per km
  - Vehicle type multiplier: 1.0x (economy), 1.3x (comfort), 1.6x (premium)
  - Platform fee: 20% of total fare
  - Driver earnings: 80% of total fare

### 6.3 Payment Methods
- **Stripe Integration**:
  1. User clicks "Pay Now"
  2. System creates Stripe checkout session
  3. User redirected to secure payment page
  4. Payment processed via Stripe
  5. Webhook confirms payment success
  6. Receipt generated and stored

### 6.4 Payment Confirmation
- **Notifications**:
  ```json
  {
    "type": "payment_completed",
    "amount": 25.50,
    "currency": "Ⓣ",
    "transaction_id": "txn_1234567890",
    "receipt_url": "https://receipts.example.com/123"
  }
  ```

---

## 7. Rating & Feedback

### 7.1 Driver Rating
- **Process**:
  1. Payment completed successfully
  2. Rating prompt appears
  3. User selects 1-5 stars
  4. Optional feedback text
  5. Submits via `POST /api/rides/{match_id}/rate`

### 7.2 Rating Impact
- **Driver Profile**: Rating affects driver's overall score
- **Future Matching**: Higher-rated drivers get priority
- **Feedback**: Stored for driver improvement

### 7.3 Notification to Driver
- Driver receives notification of rating received
- Can view feedback in their dashboard

---

## 8. Alternative Flows

### 8.1 Cancellation Scenarios

#### Rider Cancellation
- **Before Driver Acceptance**:
  1. Rider clicks "Cancel Ride"
  2. Ride status updated to "cancelled"
  3. No charges applied
  4. Other drivers still notified

- **After Driver Acceptance**:
  1. Cancellation fee may apply
  2. Driver notified of cancellation
  3. Driver can accept new rides immediately

#### Driver Cancellation
- **Process**:
  1. Driver clicks "Decline" or "Cancel"
  2. Ride status updated to "cancelled"
  3. System searches for alternative drivers
  4. Rider notified of driver cancellation
  5. New driver matching process begins

### 8.2 Payment Failures
- **Retry Options**:
  1. Different payment method
  2. Update card information
  3. Contact support
- **Consequences**:
  - Ride marked as "payment_pending"
  - Driver earnings held until payment
  - Rider cannot book new rides until resolved

### 8.3 No Drivers Available
- **Process**:
  1. System searches within 100km radius
  2. No available drivers found
  3. Rider notified: "No drivers available"
  4. Options:
     - Try again later
     - Expand search radius
     - Different vehicle type
     - Different time

---

## 🔄 Ride Status Flow

```
PENDING → ACCEPTED → DRIVER_ARRIVING → IN_PROGRESS → COMPLETED
    ↓         ↓            ↓              ↓           ↓
CANCELLED  CANCELLED   CANCELLED     CANCELLED   PAID
```

## 📊 Key Metrics Tracked

- **Ride Duration**: From start to completion
- **Distance Traveled**: Actual vs. estimated
- **Fare Accuracy**: Estimated vs. actual fare
- **Driver Performance**: Rating, response time, completion rate
- **Payment Success Rate**: Successful vs. failed payments
- **Cancellation Rates**: By rider vs. driver

## 🛡️ Security & Privacy

- **Data Protection**: All personal data encrypted
- **Payment Security**: PCI DSS compliant via Stripe
- **Location Privacy**: Location data anonymized after ride completion
- **Communication**: End-to-end encrypted messaging
- **Audit Trail**: All actions logged for security monitoring

---

## 📱 Mobile Optimization

- **Responsive Design**: Works on all screen sizes
- **Touch-Friendly**: Large buttons and touch targets
- **Offline Support**: Basic functionality when connection lost
- **GPS Integration**: Accurate location services
- **Push Notifications**: Real-time updates even when app closed

This comprehensive flow ensures a smooth, secure, and user-friendly experience for riders throughout their entire journey with MobilityHub.
