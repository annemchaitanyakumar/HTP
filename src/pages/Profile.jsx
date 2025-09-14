import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Package, Lock } from 'lucide-react';
import { userService } from '@/services/userService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Profile() {
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(true); // Initialize loading as true
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // New state variables for editing
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [isSaveButtonEnabled, setIsSaveButtonEnabled] = useState(false);

  // New state variables for OTP verification
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState('');

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getUserInfo();
      console.log('Fetched profile data:', data); // Log the fetched data
      setProfileData(data);
      setEditedData(data); // Initialize editedData with fetched data
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile data');
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || 'Failed to load profile data'
      });
    } finally {
      setLoading(false);
    }
  }, [userService, toast]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Function to handle input changes
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    // Map the HTML input ids to the backend DTO field names
    const fieldMapping = {
      'mobile': 'mobilenum',
      'email': 'emailid'
    };

    setEditedData(prevData => ({
      ...prevData,
      [fieldMapping[id] || id]: value
    }));
  };

  // Function to enable Save Changes button if data has been modified
  useEffect(() => {
    if (profileData && editedData) {
      const hasChanges =
        profileData?.firstname !== editedData?.firstname ||
        profileData?.lastname !== editedData?.lastname ||
        profileData?.emailid !== editedData?.emailid ||
        profileData?.mobilenum !== editedData?.mobilenum;
      setIsSaveButtonEnabled(hasChanges);
    }
  }, [editedData, profileData]);

  // Function to send OTP for verification
  const handleSendOtp = async () => {
    try {
      setLoading(true);
      setError('');
      const editUserDTO = {
        userid: profileData.userid,
        firstname: editedData.firstname,
        lastname: editedData.lastname,
        emailid: editedData.emailid,
        mobilenum: editedData.mobilenum
      };
      
      // Send OTP
      const response = await userService.sendOtpForUpdate(editUserDTO);
      console.log('OTP sent response:', response);
      setOtpDialogOpen(true);
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Function to validate OTP and update user details
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const validateDTO = {
        userid: profileData.userid,
        otp: otp,
        firstname: editedData.firstname,
        lastname: editedData.lastname,
        emailid: editedData.emailid,
        mobilenum: editedData.mobilenum
      };
      
      const updatedUser = await userService.updateUserInfo(validateDTO);
      setProfileData(updatedUser);
      setEditMode(false);
      setOtpDialogOpen(false);
      // Update AuthContext with new user data
      localStorage.setItem('authData', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

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
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
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

                <div className="mt-6">
                  <TabsContent value="account">
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : (
                      profileData ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="firstname">First Name</Label>
                              <Input
                                id="firstname"
                                value={editedData?.firstname || ''}
                                onChange={handleInputChange}
                                disabled={!editMode}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastname">Last Name</Label>
                              <Input
                                id="lastname"
                                value={editedData?.lastname || ''}
                                onChange={handleInputChange}
                                disabled={!editMode}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={editedData?.emailid || ''}
                              onChange={handleInputChange}
                              disabled={!editMode}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mobile">Mobile Number</Label>
                            <Input
                              id="mobile"
                              type="tel"
                              value={editedData?.mobilenum || ''}
                              onChange={handleInputChange}
                              disabled={!editMode}
                            />
                          </div>
                          {editMode ? (
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setEditMode(false);
                                  setEditedData(profileData);
                                  setIsSaveButtonEnabled(false);
                                }}
                                disabled={loading}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSendOtp}
                                disabled={loading || !isSaveButtonEnabled}
                              >
                                Save Changes
                              </Button>
                            </div>
                          ) : (
                            <Button onClick={() => setEditMode(true)} disabled={loading}>
                              Edit Profile
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div>No profile data available.</div>
                      )
                    )}
                  </TabsContent>

                  <TabsContent value="addresses">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Saved Addresses</h3>
                      <p className="text-muted-foreground">No addresses saved yet.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="orders">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Order History</h3>
                      <p className="text-muted-foreground">No orders found.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="security">
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
                </div>
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

      {/* OTP Verification Dialog */}
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>OTP Verification</DialogTitle>
            <DialogDescription>
              Enter the OTP sent to your email to update your profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="otp" className="text-right">
                OTP
              </Label>
              <Input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <Button onClick={handleUpdateProfile} disabled={loading}>
            Verify OTP and Update
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}