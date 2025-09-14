import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { useToast } from '@/components/ui/use-toast';
import { useToast } from '../hooks/use-toast';
import { User, MapPin, Package, Lock } from 'lucide-react';
import { userService } from '@/services/userService';

export default function Profile() {
  // Initialize state with defaultTab
  const defaultTab = 'account';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Fetch profile data
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getUserInfo();
      setProfileData(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Failed to load profile data'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load profile data on component mount
  useEffect(() => {
    fetchProfileData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="p-6">
              <Tabs defaultValue={defaultTab} value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 gap-4">
                  <TabsTrigger value="account" className="data-[state=active]:bg-primary">
                    <User className="h-4 w-4 mr-2" />
                    Account
                  </TabsTrigger>
                  <TabsTrigger value="addresses">
                    <MapPin className="h-4 w-4 mr-2" />
                    Addresses
                  </TabsTrigger>
                  <TabsTrigger value="orders">
                    <Package className="h-4 w-4 mr-2" />
                    Orders
                  </TabsTrigger>
                  <TabsTrigger value="security">
                    <Lock className="h-4 w-4 mr-2" />
                    Security
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="mt-6">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstname">First Name</Label>
                          <Input 
                            id="firstname"
                            defaultValue={profileData?.firstname || ''}
                            readOnly
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastname">Last Name</Label>
                          <Input 
                            id="lastname"
                            defaultValue={profileData?.lastname || ''}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email"
                          type="email"
                          defaultValue={profileData?.emailid || ''}
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number</Label>
                        <Input 
                          id="mobile"
                          type="tel"
                          defaultValue={profileData?.mobilenum || ''}
                          readOnly
                        />
                      </div>
                      <Button 
                        onClick={fetchProfileData}
                        disabled={loading}
                        className="mt-4"
                      >
                        {loading ? 'Refreshing...' : 'Refresh Profile'}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="addresses" className="mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Saved Addresses</h3>
                    <p className="text-muted-foreground">No addresses saved yet.</p>
                  </div>
                </TabsContent>

                <TabsContent value="orders" className="mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Order History</h3>
                    <p className="text-muted-foreground">No orders found.</p>
                  </div>
                </TabsContent>

                <TabsContent value="security" className="mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Security Settings</h3>
                    <form className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input type="password" id="currentPassword" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input type="password" id="newPassword" />
                      </div>
                      <Button type="submit">Update Password</Button>
                    </form>
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}