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

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
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
        await authService.forgotPassword(forgotPasswordState.email);
        setForgotPasswordState(prev => ({ ...prev, step: 'otp', loading: false }));
      } else if (forgotPasswordState.step === 'otp') {
        await authService.validateResetOtp(forgotPasswordState.email, forgotPasswordState.otp);
        setForgotPasswordState(prev => ({ ...prev, step: 'reset', loading: false }));
      } else if (forgotPasswordState.step === 'reset') {
        await authService.resetPassword(forgotPasswordState.email, forgotPasswordState.newPassword);
        setForgotPasswordState(prev => ({ ...prev, showModal: false, loading: false }));
        alert('Password reset successfully. Please log in with your new password.');
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

                      <div className="text-right">
                        <button
                          type="button"
                          onClick={openForgotPasswordModal}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot your password?
                        </button>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 shadow-warm"
                        disabled={loading}
                      >
                        {loading ? 'Logging in...' : 'Login'}
                      </Button>
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
              )}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={forgotPasswordState.loading}
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