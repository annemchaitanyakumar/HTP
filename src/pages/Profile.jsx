import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { User, MapPin, Package, Lock, Plus, ShoppingBag } from 'lucide-react';
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
  const navigate = useNavigate();

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
      setOtp('');
      // Update AuthContext with new user data
      localStorage.setItem('authData', JSON.stringify(updatedUser));
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || 'Invalid OTP. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 pt-16 sm:pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="firstname" className="text-sm sm:text-base">First Name</Label>
                              <Input
                                id="firstname"
                                value={editedData?.firstname || ''}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                className="h-9 sm:h-10"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastname" className="text-sm sm:text-base">Last Name</Label>
                              <Input
                                id="lastname"
                                value={editedData?.lastname || ''}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                className="h-9 sm:h-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={editedData?.emailid || ''}
                              onChange={handleInputChange}
                              disabled={!editMode}
                              className="h-9 sm:h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mobile" className="text-sm sm:text-base">Mobile Number</Label>
                            <Input
                              id="mobile"
                              type="tel"
                              value={editedData?.mobilenum || ''}
                              onChange={handleInputChange}
                              disabled={!editMode}
                              className="h-9 sm:h-10"
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
                    <div className="space-y-6">
                      <h3 className="text-lg sm:text-xl font-medium">Saved Addresses</h3>
                      <div className="space-y-4">
                        <p className="text-muted-foreground text-sm sm:text-base">No addresses saved yet.</p>
                        <Button className="w-full sm:w-auto">
                          <Plus className="w-4 h-4 mr-2" />
                          Add New Address
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="orders">
                    <div className="space-y-6">
                      <h3 className="text-lg sm:text-xl font-medium">Order History</h3>
                      <div className="space-y-4">
                        <p className="text-muted-foreground text-sm sm:text-base">No orders found.</p>
                        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => navigate("/products")}>
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Browse Products
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="security">
                    <div className="space-y-6">
                      <h3 className="text-lg sm:text-xl font-medium">Security Settings</h3>
                      <form className="space-y-6 max-w-md">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-sm sm:text-base">Current Password</Label>
                          <Input 
                            type="password" 
                            id="currentPassword"
                            className="h-9 sm:h-10" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-sm sm:text-base">New Password</Label>
                          <Input 
                            type="password" 
                            id="newPassword"
                            className="h-9 sm:h-10" 
                          />
                        </div>
                        <Button type="submit" className="w-full sm:w-auto">Update Password</Button>
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
        <DialogContent className="w-[90%] max-w-[425px] p-4 sm:p-6">
          <DialogHeader className="space-y-3">
            {/* <DialogTitle className="text-xl sm:text-2xl text-center">OTP Verification</DialogTitle>
            <DialogDescription className="text-center text-sm sm:text-base">
              Enter the OTP sent to your email to update your profile.
            </DialogDescription> */}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-4">
              <Label className="text-center">Enter OTP</Label>
              <p className="text-sm text-muted-foreground text-center px-2">
                Please enter the 6-digit code sent to your email
              </p>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                render={({ slots }) => (
                  <InputOTPGroup className="gap-2 sm:gap-3 justify-center max-w-[280px] mx-auto">
                    {slots.map((slot, index) => (
                      <React.Fragment key={index}>
                        <InputOTPSlot 
                          className="rounded-md border w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-center" 
                          {...slot} 
                        />
                      </React.Fragment>
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>
          </div>
          <Button onClick={handleUpdateProfile} disabled={loading || otp.length < 6}>
            Verify OTP and Update
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}