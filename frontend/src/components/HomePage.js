import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Clock, 
  Shield, 
  Smartphone, 
  Star, 
  Users, 
  Car, 
  CreditCard,
  ChevronRight,
  Check,
  Zap,
  Globe
} from 'lucide-react';

const HomePage = ({ onGetStarted }) => {
  const features = [
    {
      icon: <MapPin className="h-8 w-8 text-emerald-600" />,
      title: "Real-time Tracking",
      description: "Track your ride in real-time with precise GPS location and live updates."
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Safe & Secure",
      description: "Verified drivers, secure payments, and 24/7 safety monitoring."
    },
    {
      icon: <Clock className="h-8 w-8 text-orange-600" />,
      title: "Quick Booking",
      description: "Book a ride in seconds with our intuitive and fast booking system."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-purple-600" />,
      title: "Flexible Payments",
      description: "Multiple payment options including cards, wallets, and cash."
    },
    {
      icon: <Smartphone className="h-8 w-8 text-indigo-600" />,
      title: "Mobile Optimized",
      description: "Works perfectly on all devices - mobile, tablet, and desktop."
    },
    {
      icon: <Star className="h-8 w-8 text-yellow-600" />,
      title: "Quality Service",
      description: "Rate and review your experience to maintain high service standards."
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Set Your Destination",
      description: "Enter your pickup location and where you want to go",
      icon: <MapPin className="h-6 w-6" />
    },
    {
      step: "2",
      title: "Choose Your Ride",
      description: "Select from available vehicle types and see pricing",
      icon: <Car className="h-6 w-6" />
    },
    {
      step: "3",
      title: "Track Your Driver",
      description: "See your driver's location and estimated arrival time",
      icon: <Clock className="h-6 w-6" />
    },
    {
      step: "4",
      title: "Enjoy Your Ride",
      description: "Travel safely and rate your experience",
      icon: <Star className="h-6 w-6" />
    }
  ];

  const stats = [
    { label: "Happy Riders", value: "50K+", icon: <Users className="h-6 w-6" /> },
    { label: "Verified Drivers", value: "5K+", icon: <Car className="h-6 w-6" /> },
    { label: "Cities Covered", value: "25+", icon: <Globe className="h-6 w-6" /> },
    { label: "Rides Completed", value: "100K+", icon: <Zap className="h-6 w-6" /> }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="px-6 py-2 text-sm font-medium">
              🚀 Now Live in 25+ Cities
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="gradient-text">Fuck</span> the
              <br />
              <span className="gradient-text-orange">System</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Break free from ordinary rides. Join the revolution of mobility that doesn't play by the rules.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
              <Button 
                onClick={onGetStarted}
                size="lg"
                className="btn-primary px-8 py-4 text-lg font-semibold"
                data-testid="get-started-btn"
              >
                Get Started
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg font-semibold border-2 hover:bg-gray-50"
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-gray-200">
              {stats.map((stat, index) => (
                <div key={index} className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                    {stat.icon}
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="secondary" className="px-4 py-2">
              Why Choose MobilityHub
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Built for Modern Travel
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the next generation of ride-sharing with cutting-edge features designed for your convenience and safety.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="card-hover border-0 shadow-lg">
                <CardHeader className="space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <Badge variant="secondary" className="px-4 py-2">
              Simple Process
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get from point A to point B in just four simple steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                <Card className="card-hover border-0 shadow-lg text-center">
                  <CardHeader className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {step.step}
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
                      {step.description}
                    </CardDescription>
                  </CardContent>
                </Card>
                
                {/* Connector Line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 left-full w-8 h-0.5 bg-gradient-to-r from-indigo-300 to-purple-300 transform -translate-y-1/2 z-10">
                    <ChevronRight className="absolute -right-2 -top-2 h-4 w-4 text-indigo-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              Join thousands of satisfied riders and drivers who trust MobilityHub for their daily transportation needs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={onGetStarted}
                size="lg"
                variant="secondary"
                className="px-8 py-4 text-lg font-semibold bg-white text-indigo-600 hover:bg-gray-50"
                data-testid="cta-get-started-btn"
              >
                Start Riding Now
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                onClick={onGetStarted}
                size="lg"
                variant="outline"
                className="px-8 py-4 text-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-indigo-600"
              >
                Become a Driver
              </Button>
            </div>
            
            <div className="flex items-center justify-center space-x-6 pt-8">
              <div className="flex items-center space-x-2 text-indigo-100">
                <Check className="h-5 w-5" />
                <span>Available 24/7</span>
              </div>
              <div className="flex items-center space-x-2 text-indigo-100">
                <Check className="h-5 w-5" />
                <span>No Setup Fees</span>
              </div>
              <div className="flex items-center space-x-2 text-indigo-100">
                <Check className="h-5 w-5" />
                <span>Instant Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;