import React from 'react';
import GravatarAvatar from './ui/GravatarAvatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Demo component to showcase GravatarAvatar functionality
 * Shows how different users get unique avatars
 */
const GravatarDemo = () => {
  const demoUsers = [
    { id: 'user-1', name: 'John Doe' },
    { id: 'user-2', name: 'Jane Smith' },
    { id: 'user-3', name: 'Alice Johnson' },
    { id: 'user-4', name: 'Bob Wilson' },
    { id: 'user-5', name: 'Carol Brown' },
    { id: 'user-6', name: 'David Lee' },
    { id: 'user-7', name: 'Emma Davis' },
    { id: 'user-8', name: 'Frank Miller' },
    { id: 'user-9', name: 'Grace Taylor' },
    { id: 'user-10', name: 'Henry Anderson' },
    { id: 'user-11', name: 'Ivy Martinez' },
    { id: 'user-12', name: 'Jack Thompson' }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          GravatarAvatar Demo
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Each user gets a unique avatar with the first 2 characters of their name, 
          a unique background color based on their UserID, and consistent styling.
        </p>
      </div>

      {/* Different sizes */}
      <Card>
        <CardHeader>
          <CardTitle>Different Sizes</CardTitle>
          <CardDescription>
            GravatarAvatar scales perfectly at any size
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <GravatarAvatar name="John Doe" userId="demo-1" size={24} />
              <p className="text-xs mt-1">24px</p>
            </div>
            <div className="text-center">
              <GravatarAvatar name="John Doe" userId="demo-1" size={32} />
              <p className="text-xs mt-1">32px</p>
            </div>
            <div className="text-center">
              <GravatarAvatar name="John Doe" userId="demo-1" size={48} />
              <p className="text-xs mt-1">48px</p>
            </div>
            <div className="text-center">
              <GravatarAvatar name="John Doe" userId="demo-1" size={64} />
              <p className="text-xs mt-1">64px</p>
            </div>
            <div className="text-center">
              <GravatarAvatar name="John Doe" userId="demo-1" size={96} />
              <p className="text-xs mt-1">96px</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unique avatars for different users */}
      <Card>
        <CardHeader>
          <CardTitle>Unique Avatars for Different Users</CardTitle>
          <CardDescription>
            Each user gets a unique color combination and pattern based on their UserID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {demoUsers.map((user) => (
              <div key={user.id} className="text-center space-y-2">
                <GravatarAvatar 
                  name={user.name} 
                  userId={user.id} 
                  size={64}
                  showBorder={true}
                />
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.id}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Consistency test */}
      <Card>
        <CardHeader>
          <CardTitle>Consistency Test</CardTitle>
          <CardDescription>
            Same user always gets the same avatar (reload page to verify)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="text-center">
                <GravatarAvatar 
                  name="Alice Johnson" 
                  userId="consistent-user-123" 
                  size={48}
                />
                <p className="text-xs mt-1">Instance {i}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-4">
            All instances above should look identical for the same user
          </p>
        </CardContent>
      </Card>

      {/* With borders */}
      <Card>
        <CardHeader>
          <CardTitle>With Borders</CardTitle>
          <CardDescription>
            Optional border styling for different contexts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <GravatarAvatar 
                name="John Doe" 
                userId="border-demo-1" 
                size={48}
                showBorder={false}
              />
              <p className="text-xs mt-1">No Border</p>
            </div>
            <div className="text-center">
              <GravatarAvatar 
                name="John Doe" 
                userId="border-demo-2" 
                size={48}
                showBorder={true}
                borderColor="#E5E7EB"
              />
              <p className="text-xs mt-1">Gray Border</p>
            </div>
            <div className="text-center">
              <GravatarAvatar 
                name="John Doe" 
                userId="border-demo-3" 
                size={48}
                showBorder={true}
                borderColor="#3B82F6"
              />
              <p className="text-xs mt-1">Blue Border</p>
            </div>
            <div className="text-center">
              <GravatarAvatar 
                name="John Doe" 
                userId="border-demo-4" 
                size={48}
                showBorder={true}
                borderColor="#10B981"
              />
              <p className="text-xs mt-1">Green Border</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GravatarDemo;
