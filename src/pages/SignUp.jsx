import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Navbar } from '@/components/Navbar';
import { authService } from '@/services/authService';

export default function SignUp() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    emailid: '',
    password: '',
    confirmPassword: '',
    mobilenum: '',
    otp: ''
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    
    if (id === 'mobilenum') {
      // Only allow numbers and limit to 10 digits
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [id]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate form data
      if (!formData.firstname || !formData.lastname) {
        throw new Error('Please enter your full name');
      }

      if (!formData.emailid || !/\S+@\S+\.\S+/.test(formData.emailid)) {
        throw new Error('Please enter a valid email address');
      }

      if (!formData.mobilenum || String(formData.mobilenum).length !== 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (!showOtpForm) {
        try {
          // First step: Register and send OTP
          const registrationData = {
            firstname: formData.firstname,
            lastname: formData.lastname,
            emailid: formData.emailid,
            password: formData.password,
            mobilenum: parseInt(formData.mobilenum, 10)
          };
          const response = await authService.register(registrationData);
          setShowOtpForm(true);
          setError(response.message || 'OTP has been sent to your email. Please verify to complete registration.');
        } catch (err) {
          if (err.message.includes('Database connection')) {
            setError('Our servers are busy. Please try again in a few minutes.');
          } else {
            setError(err.message);
          }
          throw err; // Re-throw to prevent state changes
        }
      } else {
        // Second step: Verify OTP
        if (!formData.otp) {
          throw new Error('Please enter the OTP sent to your email');
        }
        try {
          await authService.verifyOtp(formData); // Pass the complete form data
          navigate('/login');
        } catch (err) {
          if (err.message.includes('Database connection')) {
            setError('Our servers are busy. Please try again in a few minutes.');
          } else {
            setError(err.message);
          }
          throw err; // Re-throw to prevent state changes
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  Join <span className="gradient-primary bg-clip-text text-transparent">Homely Taste</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  {!showOtpForm ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstname">First Name</Label>
                          <Input
                            id="firstname"
                            type="text"
                            value={formData.firstname}
                            onChange={handleInputChange}
                            placeholder="First name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastname">Last Name</Label>
                          <Input
                            id="lastname"
                            type="text"
                            value={formData.lastname}
                            onChange={handleInputChange}
                            placeholder="Last name"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emailid">Email</Label>
                        <Input
                          id="emailid"
                          type="email"
                          value={formData.emailid}
                          onChange={handleInputChange}
                          placeholder="Enter your email"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mobilenum">Mobile Number</Label>
                        <Input
                          id="mobilenum"
                          type="tel"
                          value={formData.mobilenum}
                          onChange={handleInputChange}
                          placeholder="Enter your mobile number"
                          pattern="[0-9]{10}"
                          maxLength={10}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Choose a password"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        value={formData.otp}
                        onChange={handleInputChange}
                        placeholder="Enter the 6-digit OTP"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        Please check your email for the OTP. It is valid for 5 minutes.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full gradient-primary text-primary-foreground"
                    disabled={loading}
                  >
                    {loading 
                      ? (showOtpForm ? 'Verifying OTP...' : 'Creating Account...') 
                      : (showOtpForm ? 'Verify OTP' : 'Create Account')}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
