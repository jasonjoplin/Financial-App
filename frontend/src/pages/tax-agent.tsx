import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material'
import { 
  CloudUpload as UploadIcon,
  Description as PdfIcon,
  Assignment as FormIcon,
  MenuBook as InstructionsIcon,
  SmartToy as AIIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface UploadedFile {
  id: string
  name: string
  type: 'form' | 'instructions'
  size: number
  uploadDate: string
  status: 'uploaded' | 'processing' | 'processed' | 'error'
}

interface TaxFormData {
  formId: string
  formName: string
  fields: Record<string, any>
  calculations: Record<string, number>
  status: 'draft' | 'filled' | 'reviewed' | 'completed'
}

export default function TaxAgent() {
  const { user, company, token } = useAuth()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [taxForms, setTaxForms] = useState<TaxFormData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedForm, setSelectedForm] = useState<TaxFormData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [missingInfoDialog, setMissingInfoDialog] = useState(false)
  const [missingInfo, setMissingInfo] = useState<string[]>([])
  
  const formFileInputRef = useRef<HTMLInputElement>(null)
  const instructionsFileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File, type: 'form' | 'instructions') => {
    if (!file.type.includes('pdf')) {
      toast.error('Please upload PDF files only')
      return
    }

    const newFile: UploadedFile = {
      id: Date.now().toString(),
      name: file.name,
      type,
      size: file.size,
      uploadDate: new Date().toISOString(),
      status: 'uploaded'
    }

    setUploadedFiles(prev => [...prev, newFile])
    toast.success(`${type === 'form' ? 'Tax form' : 'Instructions'} uploaded successfully`)

    // Simulate processing
    setTimeout(() => {
      setUploadedFiles(prev => prev.map(f => 
        f.id === newFile.id ? { ...f, status: 'processed' } : f
      ))
    }, 2000)
  }

  const handleFormUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'form')
    }
  }

  const handleInstructionsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'instructions')
    }
  }

  const processTaxForms = async () => {
    if (!user || !company) {
      toast.error('Please login to use the Tax Agent')
      return
    }

    const formFiles = uploadedFiles.filter(f => f.type === 'form' && f.status === 'processed')
    const instructionFiles = uploadedFiles.filter(f => f.type === 'instructions' && f.status === 'processed')

    if (formFiles.length === 0) {
      toast.error('Please upload at least one tax form')
      return
    }

    if (instructionFiles.length === 0) {
      toast.error('Please upload instructions for your tax forms')
      return
    }

    setIsProcessing(true)
    
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Create mock tax form data
      const mockForms: TaxFormData[] = formFiles.map((file, index) => ({
        formId: `form_${index + 1}`,
        formName: file.name.replace('.pdf', ''),
        fields: {
          'Line 1': company.name,
          'Line 2': 'Tax Year 2024',
          'Line 3': 'Accrual Method',
          'Line 4': 'USD',
          // Add more fields based on company data
        },
        calculations: {
          'Total Income': 125000,
          'Total Deductions': 35000,
          'Taxable Income': 90000,
          'Tax Liability': 18000
        },
        status: 'filled'
      }))

      setTaxForms(mockForms)
      toast.success('Tax forms processed successfully!')
      
      // Simulate missing information scenario
      setTimeout(() => {
        setMissingInfo(['Quarterly estimated tax payments', 'Equipment purchase dates', 'Employee benefits costs'])
        setMissingInfoDialog(true)
      }, 1000)
      
    } catch (error) {
      toast.error('Failed to process tax forms')
    } finally {
      setIsProcessing(false)
    }
  }

  const reviewForm = (form: TaxFormData) => {
    setSelectedForm(form)
    setDialogOpen(true)
  }

  const doubleCheckForm = async (form: TaxFormData) => {
    setIsProcessing(true)
    
    try {
      // Simulate AI double-checking
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update form status
      setTaxForms(prev => prev.map(f => 
        f.formId === form.formId ? { ...f, status: 'reviewed' } : f
      ))
      
      toast.success('Form double-checked and verified!')
    } catch (error) {
      toast.error('Failed to verify form')
    } finally {
      setIsProcessing(false)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    toast.success('File removed')
  }

  const handleMissingInfoSubmit = () => {
    if (userInput.trim()) {
      toast.success('Additional information received. Updating forms...')
      setMissingInfoDialog(false)
      setUserInput('')
      
      // Simulate updating forms with new information
      setTimeout(() => {
        setTaxForms(prev => prev.map(form => ({
          ...form,
          fields: {
            ...form.fields,
            'Additional Info': userInput.trim()
          }
        })))
        toast.success('Forms updated with your information')
      }, 1000)
    }
  }

  if (!user) {
    return (
      <Layout title="Tax Agent">
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Alert severity="warning">
            Please login to access the Tax Agent feature.
          </Alert>
        </Container>
      </Layout>
    )
  }

  return (
    <Layout title="Tax Agent">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h1" gutterBottom className="gradient-text">
            🧾 Tax Agent
          </Typography>
          <Typography variant="h4" color="text.secondary" gutterBottom>
            AI-Powered Tax Form Processing
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Upload your IRS forms and instructions. Our AI will fill them out using your financial data.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Upload Section */}
          <Grid item xs={12} md={6}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" gutterBottom className="gradient-text">
                  📤 Upload Documents
                </Typography>
                
                {/* Form Upload */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    <FormIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    IRS Tax Forms
                  </Typography>
                  <input
                    type="file"
                    accept=".pdf"
                    ref={formFileInputRef}
                    onChange={handleFormUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => formFileInputRef.current?.click()}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Upload Tax Forms (PDF)
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Upload your IRS tax forms (1040, 1120, 1065, etc.)
                  </Typography>
                </Box>

                {/* Instructions Upload */}
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    <InstructionsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Form Instructions
                  </Typography>
                  <input
                    type="file"
                    accept=".pdf"
                    ref={instructionsFileInputRef}
                    onChange={handleInstructionsUpload}
                    style={{ display: 'none' }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => instructionsFileInputRef.current?.click()}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Upload Instructions (PDF)
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Upload the corresponding IRS instruction documents
                  </Typography>
                </Box>

                {/* Process Button */}
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={processTaxForms}
                  disabled={isProcessing || uploadedFiles.length === 0}
                  startIcon={isProcessing ? <CircularProgress size={20} /> : <AIIcon />}
                  sx={{ mt: 2 }}
                >
                  {isProcessing ? 'Processing Forms...' : 'Process with AI'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Uploaded Files */}
          <Grid item xs={12} md={6}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" gutterBottom className="gradient-text">
                  📁 Uploaded Files
                </Typography>
                
                {uploadedFiles.length === 0 ? (
                  <Box textAlign="center" py={4}>
                    <PdfIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      No files uploaded yet
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {uploadedFiles.map((file) => (
                      <ListItem key={file.id}>
                        <ListItemIcon>
                          <PdfIcon color={file.type === 'form' ? 'primary' : 'secondary'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={file.name}
                          secondary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip 
                                label={file.type === 'form' ? 'Tax Form' : 'Instructions'} 
                                size="small"
                                color={file.type === 'form' ? 'primary' : 'secondary'}
                              />
                              <Chip 
                                label={file.status} 
                                size="small"
                                color={file.status === 'processed' ? 'success' : 'default'}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </Typography>
                            </Box>
                          }
                        />
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeFile(file.id)}
                          startIcon={<DeleteIcon />}
                        >
                          Remove
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Processed Forms */}
          {taxForms.length > 0 && (
            <Grid item xs={12}>
              <Card className="glass-card">
                <CardContent>
                  <Typography variant="h5" gutterBottom className="gradient-text">
                    📋 Processed Tax Forms
                  </Typography>
                  
                  <Grid container spacing={3}>
                    {taxForms.map((form) => (
                      <Grid item xs={12} md={6} key={form.formId}>
                        <Paper 
                          className="neon-border" 
                          sx={{ p: 3, bgcolor: 'rgba(0, 245, 255, 0.05)' }}
                        >
                          <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                            <Typography variant="h6" className="neon-text">
                              {form.formName}
                            </Typography>
                            <Chip 
                              label={form.status} 
                              color={
                                form.status === 'completed' ? 'success' :
                                form.status === 'reviewed' ? 'info' :
                                form.status === 'filled' ? 'warning' : 'default'
                              }
                            />
                          </Box>
                          
                          <Typography variant="body2" color="text.secondary" mb={2}>
                            Form filled with company financial data
                          </Typography>
                          
                          <Box display="flex" gap={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => reviewForm(form)}
                            >
                              Review
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => doubleCheckForm(form)}
                              disabled={isProcessing}
                              startIcon={form.status === 'reviewed' ? <CheckIcon /> : <WarningIcon />}
                            >
                              {form.status === 'reviewed' ? 'Verified' : 'Double Check'}
                            </Button>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* Form Review Dialog */}
        <Dialog 
          open={dialogOpen} 
          onClose={() => setDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Review Tax Form: {selectedForm?.formName}
          </DialogTitle>
          <DialogContent>
            {selectedForm && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Form Fields:
                </Typography>
                <List>
                  {Object.entries(selectedForm.fields).map(([field, value]) => (
                    <ListItem key={field}>
                      <ListItemText
                        primary={field}
                        secondary={value}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Calculations:
                </Typography>
                <List>
                  {Object.entries(selectedForm.calculations).map(([calc, value]) => (
                    <ListItem key={calc}>
                      <ListItemText
                        primary={calc}
                        secondary={`$${value.toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Missing Information Dialog */}
        <Dialog 
          open={missingInfoDialog} 
          onClose={() => setMissingInfoDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Additional Information Needed
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" mb={2}>
              The AI needs additional information to complete your tax forms:
            </Typography>
            <List>
              {missingInfo.map((info, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText primary={info} />
                </ListItem>
              ))}
            </List>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Provide additional information"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              margin="normal"
              placeholder="Please provide the missing information..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMissingInfoDialog(false)}>
              Skip for now
            </Button>
            <Button 
              variant="contained" 
              onClick={handleMissingInfoSubmit}
              disabled={!userInput.trim()}
            >
              Submit Information
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}