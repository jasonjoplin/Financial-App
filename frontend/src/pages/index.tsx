import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  TextField,
  Grid,
  CircularProgress,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material'
import { 
  SmartToy as AIIcon,
  AccountBalance as AccountIcon,
  Assessment as ChartIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingIcon,
  Psychology as BrainIcon,
  AutoAwesome as AutoIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface HealthData {
  status: string
  message: string
  timestamp: string
  features: string[]
}

interface AnalysisResult {
  message: string
  analysis: {
    title: string
    description: string
    reasoning: string
    confidence_score: number
    suggested_entries: Array<{
      account_name: string
      account_code: string
      debit_amount: number
      credit_amount: number
      description: string
    }>
    validation: {
      is_balanced: boolean
      total_debits: number
      total_credits: number
      gaap_compliant: boolean
    }
  }
  processing_time_ms: number
  model_used: string
}

export default function Home() {
  const { user, company, token, login, logout, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [signUpData, setSignUpData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    company_name: ''
  })
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [transactionDescription, setTransactionDescription] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    // Fetch health data on load
    fetchHealthData()
  }, [])

  const fetchHealthData = async () => {
    try {
      const response = await fetch('http://localhost:3001/health')
      const data = await response.json()
      setHealthData(data)
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    }
  }

  const handleLogin = async () => {
    setLoginLoading(true)
    await login(email, password)
    setLoginLoading(false)
  }

  const handleSignUp = async () => {
    setLoginLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signUpData),
      })

      const data = await response.json()

      if (response.ok) {
        // Registration successful - use the returned token directly
        localStorage.setItem('financial-ai-token', data.token)
        localStorage.setItem('financial-ai-user', JSON.stringify(data.user))
        localStorage.setItem('financial-ai-company', JSON.stringify(data.company))
        
        toast.success(`Welcome, ${data.user.first_name || data.user.name}! Your account has been created.`)
        
        // Redirect to dashboard or reload to update auth state
        window.location.reload()
      } else {
        toast.error(data.error || 'Registration failed')
      }
    } catch (error) {
      toast.error('Connection error. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  const analyzeTransaction = async () => {
    if (!token) {
      toast.error('Please login first')
      return
    }

    setAnalyzing(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/ai/test/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: transactionDescription,
          amount: parseFloat(transactionAmount),
          date: new Date().toISOString().split('T')[0]
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setAnalysisResult(data)
        toast.success('AI analysis completed!')
      } else {
        toast.error(data.error || 'Analysis failed')
      }
    } catch (error) {
      toast.error('Connection error')
    } finally {
      setAnalyzing(false)
    }
  }

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        bgcolor="#0a0e1a"
      >
        <CircularProgress size={60} sx={{ color: '#00f5ff' }} />
      </Box>
    )
  }

  return (
    <Layout title="AI Analysis Dashboard">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={6} className="animate-slide-in">
          <Typography variant="h1" gutterBottom className="gradient-text">
            Financial AI
          </Typography>
          <Typography variant="h3" color="text.secondary" gutterBottom>
            Intelligent Accounting Automation
          </Typography>
          <Box display="flex" justifyContent="center" gap={1} mt={2}>
            <Chip 
              icon={<AIIcon />} 
              label="AI-Powered" 
              color="primary" 
              variant="outlined"
              className="animate-glow"
            />
            <Chip 
              icon={<SecurityIcon />} 
              label="GAAP Compliant" 
              color="secondary" 
              variant="outlined"
            />
            <Chip 
              icon={<SpeedIcon />} 
              label="Real-time" 
              sx={{ borderColor: '#00e676', color: '#00e676' }}
              variant="outlined"
            />
          </Box>
        </Box>

        {/* System Status */}
        {healthData && (
          <Card className="glass-card animate-fade-in" sx={{ mb: 4 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box
                  width={12}
                  height={12}
                  borderRadius="50%"
                  bgcolor={healthData.status === 'OK' ? '#00e676' : '#f44336'}
                  className={healthData.status === 'OK' ? 'animate-pulse-subtle' : ''}
                />
                <Typography variant="h6" className="neon-text">
                  System Status: {healthData.status}
                </Typography>
                <Chip 
                  label={`Last Updated: ${new Date(healthData.timestamp).toLocaleTimeString()}`}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Grid container spacing={2}>
                {healthData.features?.map((feature, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AutoIcon sx={{ color: '#00f5ff', fontSize: 16 }} />
                      <Typography variant="body2" color="text.secondary">
                        {feature}
                      </Typography>
                    </Box>
                  </Grid>
                )) || (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      No features data available
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={4}>
          {/* Authentication Section */}
          {!user ? (
            <Grid item xs={12} md={6}>
              <Card className="glass-card animate-slide-in">
                <CardContent>
                  <Typography variant="h5" gutterBottom className="gradient-text">
                    🔐 {isSignUp ? 'Create Account' : 'Access Financial AI'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={3}>
                    {isSignUp ? 'Create your account to get started' : 'Login to experience intelligent accounting automation'}
                  </Typography>
                  
                  {!isSignUp ? (
                    <Box component="form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        margin="normal"
                        required
                      />
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                        required
                      />
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loginLoading}
                        sx={{ mt: 3 }}
                      >
                        {loginLoading ? <CircularProgress size={24} /> : 'Login to Financial AI'}
                      </Button>
                    </Box>
                  ) : (
                    <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSignUp(); }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="First Name"
                            value={signUpData.first_name}
                            onChange={(e) => setSignUpData({...signUpData, first_name: e.target.value})}
                            margin="normal"
                            required
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="Last Name"
                            value={signUpData.last_name}
                            onChange={(e) => setSignUpData({...signUpData, last_name: e.target.value})}
                            margin="normal"
                            required
                          />
                        </Grid>
                      </Grid>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                        margin="normal"
                        required
                      />
                      <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                        margin="normal"
                        required
                      />
                      <TextField
                        fullWidth
                        label="Phone (optional)"
                        value={signUpData.phone}
                        onChange={(e) => setSignUpData({...signUpData, phone: e.target.value})}
                        margin="normal"
                      />
                      <TextField
                        fullWidth
                        label="Company Name"
                        value={signUpData.company_name}
                        onChange={(e) => setSignUpData({...signUpData, company_name: e.target.value})}
                        margin="normal"
                        required
                      />
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loginLoading}
                        sx={{ mt: 3 }}
                      >
                        {loginLoading ? <CircularProgress size={24} /> : 'Create Account'}
                      </Button>
                    </Box>
                  )}

                  <Box mt={3} textAlign="center">
                    <Button 
                      variant="text" 
                      onClick={() => setIsSignUp(!isSignUp)}
                      sx={{ textTransform: 'none' }}
                    >
                      {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign up'}
                    </Button>
                  </Box>

                </CardContent>
              </Card>
            </Grid>
          ) : (
            /* AI Analysis Section */
            <Grid item xs={12} md={8}>
              <Card className="glass-card animate-slide-in" data-tutorial="ai-analysis-section">
                <CardContent>
                  <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                    <Box>
                      <Typography variant="h5" className="gradient-text" gutterBottom>
                        🤖 AI Transaction Analysis
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Welcome back, {user.first_name}! Company: {company?.name}
                      </Typography>
                    </Box>
                    <Button variant="outlined" onClick={logout} size="small">
                      Logout
                    </Button>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Transaction Description"
                        value={transactionDescription}
                        onChange={(e) => setTransactionDescription(e.target.value)}
                        margin="normal"
                        placeholder="e.g., Office supplies from Staples"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Amount ($)"
                        type="number"
                        value={transactionAmount}
                        onChange={(e) => setTransactionAmount(e.target.value)}
                        margin="normal"
                        placeholder="156.78"
                      />
                    </Grid>
                  </Grid>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={analyzeTransaction}
                    disabled={analyzing}
                    sx={{ mt: 3, mb: 3 }}
                    startIcon={analyzing ? <CircularProgress size={20} /> : <BrainIcon />}
                  >
                    {analyzing ? 'Analyzing with AI...' : 'Analyze Transaction with AI'}
                  </Button>

                  {analysisResult && (
                    <Paper 
                      className="neon-border animate-fade-in" 
                      sx={{ p: 3, bgcolor: 'rgba(0, 245, 255, 0.05)' }}
                    >
                      <Typography variant="h6" className="neon-text" gutterBottom>
                        ✨ AI Analysis Results
                      </Typography>
                      
                      <Box mb={2}>
                        <Typography variant="body1" gutterBottom>
                          <strong>{analysisResult.analysis.title}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {analysisResult.analysis.reasoning}
                        </Typography>
                        
                        <Box display="flex" gap={2} mb={2}>
                          <Chip 
                            label={`Confidence: ${Math.round(analysisResult.analysis.confidence_score * 100)}%`}
                            color="primary"
                            size="small"
                          />
                          <Chip 
                            label={`Processing: ${analysisResult.processing_time_ms}ms`}
                            color="secondary"
                            size="small"
                          />
                          <Chip 
                            label={analysisResult.analysis.validation.gaap_compliant ? 'GAAP Compliant ✓' : 'GAAP Issues ⚠'}
                            color={analysisResult.analysis.validation.gaap_compliant ? 'success' : 'warning'}
                            size="small"
                          />
                        </Box>
                      </Box>

                      <Typography variant="subtitle1" gutterBottom className="neon-text">
                        📊 Suggested Journal Entries:
                      </Typography>
                      
                      <List dense>
                        {analysisResult.analysis.suggested_entries.map((entry, index) => (
                          <ListItem key={index} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)', mb: 1, borderRadius: 1 }}>
                            <ListItemIcon>
                              <AccountIcon sx={{ color: entry.debit_amount > 0 ? '#00e676' : '#ff9800' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${entry.account_name} (${entry.account_code})`}
                              secondary={
                                <Box>
                                  <Typography variant="body2" component="span">
                                    {entry.description}
                                  </Typography>
                                  <br />
                                  <Typography 
                                    variant="body2" 
                                    component="span"
                                    color={entry.debit_amount > 0 ? '#00e676' : '#ff9800'}
                                    fontWeight="bold"
                                  >
                                    {entry.debit_amount > 0 
                                      ? `Debit: $${entry.debit_amount.toFixed(2)}` 
                                      : `Credit: $${entry.credit_amount.toFixed(2)}`
                                    }
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>

                      <Divider sx={{ my: 2 }} />
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          Total: ${analysisResult.analysis.validation.total_debits.toFixed(2)} 
                          {analysisResult.analysis.validation.is_balanced ? ' ✓ Balanced' : ' ⚠ Unbalanced'}
                        </Typography>
                        <Box>
                          <Button variant="outlined" size="small" sx={{ mr: 1 }}>
                            Review
                          </Button>
                          <Button variant="contained" size="small">
                            Approve & Post
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Features Showcase */}
          <Grid item xs={12} md={user ? 4 : 6}>
            <Card className="glass-card animate-slide-in">
              <CardContent>
                <Typography variant="h5" gutterBottom className="gradient-text">
                  🚀 AI Features
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <BrainIcon sx={{ color: '#00f5ff' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Smart Transaction Analysis"
                      secondary="AI recognizes expense types and suggests proper journal entries"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <AccountIcon sx={{ color: '#7c4dff' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="GAAP Compliance"
                      secondary="Ensures all entries follow accounting standards"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <TrendingIcon sx={{ color: '#00e676' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Real-time Validation"
                      secondary="Instant feedback on transaction balance and accuracy"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <ChartIcon sx={{ color: '#ff9800' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Live Financial Reports"
                      secondary="Dynamic trial balance and account summaries"
                    />
                  </ListItem>
                </List>

                {user && (
                  <Box mt={3}>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      startIcon={<ChartIcon />}
                      sx={{ mb: 1 }}
                    >
                      View Chart of Accounts
                    </Button>
                    <Button 
                      fullWidth 
                      variant="outlined"
                      startIcon={<TrendingIcon />}
                    >
                      Financial Reports
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box textAlign="center" mt={6} className="animate-fade-in">
          <Typography variant="body2" color="text.secondary">
            Financial AI App • Powered by GPT-4 • GAAP Compliant • Real-time Processing
          </Typography>
        </Box>
      </Container>
    </Layout>
  )
}