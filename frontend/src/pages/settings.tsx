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
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  LinearProgress,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material'
import {
  Settings as SettingsIcon,
  SmartToy as AIIcon,
  Security as SecurityIcon,
  Notifications as NotificationIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  PlayArrow as TestIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface AIProvider {
  name: string
  available: boolean
  models: string[]
  currentModel: string
  error?: string
}

interface AIProviderStatus {
  [key: string]: AIProvider
}

export default function SettingsPage() {
  const { token, user, company } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [providers, setProviders] = useState<AIProviderStatus>({})
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testingProvider, setTestingProvider] = useState<string>('')
  const [testResults, setTestResults] = useState<any>(null)
  
  const [aiSettings, setAiSettings] = useState({
    defaultProvider: 'openai',
    openai: {
      apiKey: '',
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 1500
    },
    anthropic: {
      apiKey: '',
      model: 'claude-3-sonnet',
      temperature: 0.1,
      maxTokens: 1500
    },
    ollama: {
      endpoint: 'http://172.20.64.1:11434',
      model: 'llama3',
      temperature: 0.1,
      maxTokens: 1500
    }
  })

  const [companySettings, setCompanySettings] = useState({
    name: company?.name || '',
    accountingMethod: company?.accounting_method || 'accrual',
    baseCurrency: company?.base_currency || 'USD',
    fiscalYearEnd: '12-31',
    taxId: '',
    address: '',
    phone: '',
    email: ''
  })

  const [userSettings, setUserSettings] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    email: user?.email || '',
    notifications: {
      email: true,
      browser: true,
      aiSuggestions: true,
      reports: false
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'US'
    }
  })

  const [showApiKeys, setShowApiKeys] = useState({
    openai: false,
    anthropic: false
  })

  useEffect(() => {
    if (token) {
      fetchProviderStatus()
    }
  }, [token])

  const fetchProviderStatus = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/ai/providers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setProviders(data.providers)
        setAiSettings(prev => ({
          ...prev,
          defaultProvider: data.defaultProvider
        }))
      } else {
        toast.error('Failed to load AI provider status')
      }
    } catch (error) {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProviderConfig = async (provider: string, config: any) => {
    if (!token) {
      toast.error('Authentication required')
      return
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/ai/providers/${provider}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${provider} configuration updated!`)
        fetchProviderStatus() // Refresh status
      } else {
        toast.error(data.error || 'Failed to update configuration')
      }
    } catch (error) {
      toast.error('Connection error')
    }
  }

  const handleTestProvider = async (provider: string) => {
    if (!token) {
      toast.error('Authentication required')
      return
    }
    
    setTestingProvider(provider)
    setTestDialogOpen(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/ai/providers/${provider}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model: aiSettings[provider as keyof typeof aiSettings]?.model
        })
      })

      const data = await response.json()
      setTestResults(data.result)
      
      if (data.result.success) {
        toast.success(`${provider} test successful!`)
      } else {
        toast.error(`${provider} test failed: ${data.result.error}`)
      }
    } catch (error) {
      toast.error('Test failed')
      setTestResults({ success: false, error: 'Connection error' })
    }
  }

  const TabPanel = ({ children, value, index }: { children: React.ReactNode, value: number, index: number }) => (
    <div hidden={value !== index}>
      {value === index && children}
    </div>
  )

  const getProviderStatusChip = (provider: AIProvider) => {
    if (provider.available) {
      return <Chip icon={<CheckIcon />} label="Available" color="success" size="small" />
    } else {
      return <Chip icon={<ErrorIcon />} label="Unavailable" color="error" size="small" />
    }
  }

  if (loading) {
    return (
      <Layout title="Settings">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '50%', color: '#00f5ff' }} />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout title="Settings">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" className="gradient-text" gutterBottom>
            ⚙️ Settings & Configuration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure AI providers, company settings, and user preferences
          </Typography>
        </Box>

        {/* Settings Tabs */}
        <Card className="glass-card">
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab 
              label="AI Providers" 
              icon={<AIIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Company" 
              icon={<BusinessIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="User Profile" 
              icon={<PersonIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Security" 
              icon={<SecurityIcon />} 
              iconPosition="start"
            />
          </Tabs>

          {/* AI Providers Tab */}
          <TabPanel value={activeTab} index={0}>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
                <Typography variant="h6" className="gradient-text">
                  🤖 AI Provider Configuration
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchProviderStatus}
                >
                  Refresh Status
                </Button>
              </Box>

              {/* Provider Status Overview */}
              <Grid container spacing={2} mb={4}>
                {Object.entries(providers).map(([key, provider]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                          <Typography variant="h6">{provider.name}</Typography>
                          {getProviderStatusChip(provider)}
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Current Model: {provider.currentModel}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Available Models: {provider.models.length}
                        </Typography>
                        {provider.error && (
                          <Typography variant="caption" color="error">
                            Error: {provider.error}
                          </Typography>
                        )}
                        <Box mt={2}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<TestIcon />}
                            onClick={() => handleTestProvider(key)}
                            disabled={!provider.available}
                          >
                            Test
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* OpenAI Configuration */}
              <Box mb={4}>
                <Typography variant="h6" sx={{ color: '#00e676', mb: 2 }}>
                  OpenAI Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="API Key"
                      type={showApiKeys.openai ? 'text' : 'password'}
                      value={aiSettings.openai.apiKey}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        openai: { ...aiSettings.openai, apiKey: e.target.value }
                      })}
                      placeholder="sk-..."
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowApiKeys({
                              ...showApiKeys,
                              openai: !showApiKeys.openai
                            })}
                          >
                            {showApiKeys.openai ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={aiSettings.openai.model}
                        onChange={(e) => setAiSettings({
                          ...aiSettings,
                          openai: { ...aiSettings.openai, model: e.target.value }
                        })}
                      >
                        <MenuItem value="gpt-4">GPT-4</MenuItem>
                        <MenuItem value="gpt-4-turbo">GPT-4 Turbo</MenuItem>
                        <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Temperature"
                      type="number"
                      value={aiSettings.openai.temperature}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        openai: { ...aiSettings.openai, temperature: parseFloat(e.target.value) }
                      })}
                      inputProps={{ min: 0, max: 1, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Max Tokens"
                      type="number"
                      value={aiSettings.openai.maxTokens}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        openai: { ...aiSettings.openai, maxTokens: parseInt(e.target.value) }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={() => handleUpdateProviderConfig('openai', aiSettings.openai)}
                    >
                      Save OpenAI Settings
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Anthropic Configuration */}
              <Box mb={4}>
                <Typography variant="h6" sx={{ color: '#ff9800', mb: 2 }}>
                  Anthropic Claude Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="API Key"
                      type={showApiKeys.anthropic ? 'text' : 'password'}
                      value={aiSettings.anthropic.apiKey}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        anthropic: { ...aiSettings.anthropic, apiKey: e.target.value }
                      })}
                      placeholder="sk-ant-..."
                      InputProps={{
                        endAdornment: (
                          <IconButton
                            onClick={() => setShowApiKeys({
                              ...showApiKeys,
                              anthropic: !showApiKeys.anthropic
                            })}
                          >
                            {showApiKeys.anthropic ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={aiSettings.anthropic.model}
                        onChange={(e) => setAiSettings({
                          ...aiSettings,
                          anthropic: { ...aiSettings.anthropic, model: e.target.value }
                        })}
                      >
                        <MenuItem value="claude-3-opus">Claude 3 Opus</MenuItem>
                        <MenuItem value="claude-3-sonnet">Claude 3 Sonnet</MenuItem>
                        <MenuItem value="claude-3-haiku">Claude 3 Haiku</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={() => handleUpdateProviderConfig('anthropic', aiSettings.anthropic)}
                    >
                      Save Anthropic Settings
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Ollama Configuration */}
              <Box mb={4}>
                <Typography variant="h6" sx={{ color: '#7c4dff', mb: 2 }}>
                  Local Ollama Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Endpoint URL"
                      value={aiSettings.ollama.endpoint}
                      onChange={(e) => setAiSettings({
                        ...aiSettings,
                        ollama: { ...aiSettings.ollama, endpoint: e.target.value }
                      })}
                      placeholder="http://172.20.64.1:11434"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Model</InputLabel>
                      <Select
                        value={aiSettings.ollama.model}
                        onChange={(e) => setAiSettings({
                          ...aiSettings,
                          ollama: { ...aiSettings.ollama, model: e.target.value }
                        })}
                      >
                        {providers.ollama?.models?.length > 0 ? (
                          providers.ollama.models.map((model) => (
                            <MenuItem key={model} value={model}>
                              {model}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem value="llama3">llama3 (default)</MenuItem>
                        )}
                        {/* Fallback option for deepseek-r1:14b */}
                        {aiSettings.ollama.model === 'deepseek-r1:14b' && 
                         !providers.ollama?.models?.includes('deepseek-r1:14b') && (
                          <MenuItem value="deepseek-r1:14b">deepseek-r1:14b</MenuItem>
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={() => handleUpdateProviderConfig('ollama', aiSettings.ollama)}
                    >
                      Save Ollama Settings
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Note:</strong> OpenAI and Anthropic require valid API keys. 
                  Ollama requires a local installation running on your machine.
                  Test each provider after configuration to ensure connectivity.
                </Typography>
              </Alert>

              {providers.ollama && !providers.ollama.available && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>WSL to Windows Ollama Configuration:</strong><br />
                    1. Start Ollama on Windows: <code>ollama serve --host 0.0.0.0</code><br />
                    2. Find your Windows IP: Run <code>ipconfig</code> in Windows CMD and look for "WSL" adapter IP<br />
                    3. Update endpoint above (try: http://[WindowsIP]:11434)<br />
                    4. Common Windows IPs: localhost, 127.0.0.1, 172.x.x.1, 192.168.x.1<br />
                    5. Pull DeepSeek R1: <code>ollama pull deepseek-r1:14b</code><br />
                    6. Test connection with "Refresh Status" button
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </TabPanel>

          {/* Company Settings Tab */}
          <TabPanel value={activeTab} index={1}>
            <CardContent>
              <Typography variant="h6" className="gradient-text" gutterBottom>
                🏢 Company Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      name: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Accounting Method</InputLabel>
                    <Select
                      value={companySettings.accountingMethod}
                      onChange={(e) => setCompanySettings({
                        ...companySettings,
                        accountingMethod: e.target.value
                      })}
                    >
                      <MenuItem value="accrual">Accrual</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Base Currency</InputLabel>
                    <Select
                      value={companySettings.baseCurrency}
                      onChange={(e) => setCompanySettings({
                        ...companySettings,
                        baseCurrency: e.target.value
                      })}
                    >
                      <MenuItem value="USD">USD - US Dollar</MenuItem>
                      <MenuItem value="EUR">EUR - Euro</MenuItem>
                      <MenuItem value="GBP">GBP - British Pound</MenuItem>
                      <MenuItem value="CAD">CAD - Canadian Dollar</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Fiscal Year End"
                    value={companySettings.fiscalYearEnd}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      fiscalYearEnd: e.target.value
                    })}
                    placeholder="MM-DD"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    multiline
                    rows={2}
                    value={companySettings.address}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      address: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      phone: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({
                      ...companySettings,
                      email: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    size="large"
                  >
                    Save Company Settings
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>

          {/* User Profile Tab */}
          <TabPanel value={activeTab} index={2}>
            <CardContent>
              <Typography variant="h6" className="gradient-text" gutterBottom>
                👤 Profile Information
              </Typography>
              
              <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={userSettings.firstName}
                    onChange={(e) => setUserSettings({
                      ...userSettings,
                      firstName: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={userSettings.lastName}
                    onChange={(e) => setUserSettings({
                      ...userSettings,
                      lastName: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={userSettings.email}
                    onChange={(e) => setUserSettings({
                      ...userSettings,
                      email: e.target.value
                    })}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" className="gradient-text" gutterBottom>
                🔔 Notification Preferences
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <NotificationIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email Notifications"
                    secondary="Receive notifications via email"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={userSettings.notifications.email}
                      onChange={(e) => setUserSettings({
                        ...userSettings,
                        notifications: {
                          ...userSettings.notifications,
                          email: e.target.checked
                        }
                      })}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AIIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="AI Suggestions"
                    secondary="Get notified about AI-generated suggestions"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={userSettings.notifications.aiSuggestions}
                      onChange={(e) => setUserSettings({
                        ...userSettings,
                        notifications: {
                          ...userSettings.notifications,
                          aiSuggestions: e.target.checked
                        }
                      })}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                size="large"
                sx={{ mt: 3 }}
              >
                Save Profile Settings
              </Button>
            </CardContent>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={3}>
            <CardContent>
              <Typography variant="h6" className="gradient-text" gutterBottom>
                🔒 Security Settings
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Security features are currently under development. 
                  Your data is encrypted and stored securely.
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Change Password
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type="password"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                  >
                    Update Password
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </TabPanel>
        </Card>

        {/* Provider Test Dialog */}
        <Dialog 
          open={testDialogOpen} 
          onClose={() => setTestDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(20, 27, 45, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          <DialogTitle>
            Testing {testingProvider} Provider
          </DialogTitle>
          <DialogContent>
            {testResults ? (
              <Box>
                <Alert severity={testResults.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    {testResults.success ? 'Connection successful!' : `Error: ${testResults.error}`}
                  </Typography>
                </Alert>
                {testResults.success && (
                  <Box>
                    <Typography variant="body2">
                      <strong>Provider:</strong> {testResults.provider}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Model:</strong> {testResults.model}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Response Time:</strong> {testResults.processingTime}ms
                    </Typography>
                    {testResults.mock && (
                      <Typography variant="caption" color="warning.main">
                        Note: This was a mock response. Configure API key for real testing.
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            ) : (
              <Box display="flex" alignItems="center" gap={2}>
                <LinearProgress sx={{ flexGrow: 1 }} />
                <Typography variant="body2">Testing connection...</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTestDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}