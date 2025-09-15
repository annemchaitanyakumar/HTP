import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    emailid: '',
    password: ''
  });
  const [forgotPasswordState, setForgotPasswordState] = useState({
    showModal: false,
    step: 'email', // 'email', 'otp', 'reset'
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    error: '',
    loading: false
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleForgotPasswordInput = (e) => {
    const { id, value } = e.target;
    setForgotPasswordState(prev => ({ ...prev, [id]: value, error: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData);
      if (response.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Failed to log in. Please check your credentials.');
    }

    setLoading(false);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotPasswordState(prev => ({ ...prev, error: '', loading: true }));

    try {
      if (forgotPasswordState.step === 'email') {
        const response = await authService.forgotPassword({
          email: forgotPasswordState.email.trim()
        });
        setForgotPasswordState(prev => ({ 
          ...prev, 
          step: 'otp', 
          loading: false,
          message: response
        }));
      } else if (forgotPasswordState.step === 'otp') {
        const response = await authService.validateResetOtp({
          email: forgotPasswordState.email.trim(),
          otp: forgotPasswordState.otp.trim()
        });
        setForgotPasswordState(prev => ({ 
          ...prev, 
          step: 'reset', 
          loading: false,
          message: response
        }));
      } else if (forgotPasswordState.step === 'reset') {
        // Remove the trim() calls as they might cause issues with comparison
        const newPassword = forgotPasswordState.newPassword;
        const confirmPassword = forgotPasswordState.confirmPassword;

        // Simple direct comparison
        if (newPassword !== confirmPassword) {
          setForgotPasswordState(prev => ({
            ...prev,
            error: "Passwords don't match",
            loading: false
          }));
          return;
        }

        try {
          const response = await authService.resetPassword({
            email: forgotPasswordState.email,
            newPassword: newPassword // Send only newPassword
          });
          
          toast({
            title: "Success!",
            description: "Password has been reset successfully. Please login with your new password.",
            variant: "default",
          });

          // Reset the form and close modal
          setForgotPasswordState({
            showModal: false,
            step: 'email',
            email: '',
            otp: '',
            newPassword: '',
            confirmPassword: '',
            error: '',
            loading: false
          });
        } catch (err) {
          setForgotPasswordState(prev => ({
            ...prev,
            error: err.message || 'Failed to reset password',
            loading: false
          }));
        }
      }
    } catch (err) {
      setForgotPasswordState(prev => ({
        ...prev,
        error: err.message || 'An error occurred',
        loading: false
      }));
    }
  };

  const openForgotPasswordModal = () => {
    setForgotPasswordState(prev => ({
      ...prev,
      showModal: true,
      step: 'email',
      email: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
      error: ''
    }));
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-warm">
        <Navbar />
        
        <div className="pt-24 pb-16 px-4">
          <div className="container max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left side - Login Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md mx-auto w-full"
              >
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-2xl text-center">
                      Welcome back to <span className="gradient-primary bg-clip-text text-transparent">Homely Taste</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
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
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter your password"
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 shadow-warm"
                        disabled={loading}
                      >
                        {loading ? 'Logging in...' : 'Login'}
                      </Button>

                      <div className="text-center">
                        <Button
                          type="button"
                          variant="link"
                          onClick={openForgotPasswordModal}
                          className="text-sm text-muted-foreground hover:text-primary"
                        >
                          Forgot your password?
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Right side - Sign Up Call to Action */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center space-y-6 p-8 max-w-md mx-auto w-full"
              >
                <h2 className="text-3xl font-bold">New to Homely Taste?</h2>
                <p className="text-muted-foreground text-lg">
                  Join our community and discover the authentic taste of homemade pickles.
                </p>
                <Link to="/signup">
                  <Button 
                    size="lg"
                    className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 shadow-warm"
                  >
                    Create an Account
                  </Button>
                </Link>
                <div className="space-y-4 mt-8">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-left text-sm">Quick and easy sign-up process</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-left text-sm">Track your orders and favorites</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        <Dialog open={forgotPasswordState.showModal} onOpenChange={(open) => setForgotPasswordState(prev => ({ ...prev, showModal: open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {forgotPasswordState.step === 'email' && 'Forgot Password'}
                {forgotPasswordState.step === 'otp' && 'Verify OTP'}
                {forgotPasswordState.step === 'reset' && 'Reset Password'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              {forgotPasswordState.error && (
                <Alert variant="destructive">
                  <AlertDescription>{forgotPasswordState.error}</AlertDescription>
                </Alert>
              )}

              {forgotPasswordState.step === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={forgotPasswordState.email}
                    onChange={handleForgotPasswordInput}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              )}

              {forgotPasswordState.step === 'otp' && (
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={forgotPasswordState.otp}
                    onChange={handleForgotPasswordInput}
                    placeholder="Enter the OTP sent to your email"
                    required
                  />
                </div>
              )}

              {forgotPasswordState.step === 'reset' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={forgotPasswordState.newPassword}
                      onChange={handleForgotPasswordInput}
                      placeholder="Enter your new password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={forgotPasswordState.confirmPassword}
                      onChange={handleForgotPasswordInput}
                      placeholder="Confirm your new password"
                      required
                    />
                  </div>
                  {forgotPasswordState.newPassword && 
                   forgotPasswordState.confirmPassword && 
                   forgotPasswordState.newPassword !== forgotPasswordState.confirmPassword && (
                    <Alert variant="destructive">
                      <AlertDescription>Passwords don't match</AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    forgotPasswordState.loading || 
                    (forgotPasswordState.step === 'reset' && 
                      (forgotPasswordState.newPassword !== forgotPasswordState.confirmPassword ||
                       !forgotPasswordState.newPassword ||
                       !forgotPasswordState.confirmPassword))
                  }
                  className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90"
                >
                  {forgotPasswordState.loading
                    ? 'Processing...'
                    : forgotPasswordState.step === 'email'
                      ? 'Send OTP'
                      : forgotPasswordState.step === 'otp'
                        ? 'Verify OTP'
                        : 'Reset Password'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}