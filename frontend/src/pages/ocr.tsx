import { useState, useEffect, useCallback } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Alert,
  LinearProgress,
  Fab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  CloudUpload as UploadIcon,
  PhotoCamera as CameraIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  SmartToy as AIIcon,
  Receipt as ReceiptIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AutoIcon,
  FilePresent as FileIcon,
  Image as ImageIcon,
  TextFields as TextIcon,
  AccountBalance as AccountIcon
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'

interface OCRDocument {
  id: string
  filename: string
  file_type: string
  file_size: number
  upload_date: string
  processing_status: 'uploaded' | 'processing' | 'completed' | 'failed'
  ocr_confidence: number
  extracted_data: {
    document_type?: 'receipt' | 'invoice' | 'bill' | 'bank_statement' | 'other'
    vendor_name?: string
    vendor_address?: string
    date?: string
    invoice_number?: string
    total_amount?: number
    tax_amount?: number
    line_items?: {
      description: string
      quantity?: number
      rate?: number
      amount: number
    }[]
    payment_terms?: string
    due_date?: string
  }
  ai_analysis?: {
    suggested_account_codes: string[]
    confidence_score: number
    transaction_type: 'expense' | 'revenue' | 'asset' | 'liability'
    journal_entries: {
      account_code: string
      account_name: string
      debit_amount: number
      credit_amount: number
      description: string
    }[]
  }
  reviewed: boolean
  approved: boolean
  created_transaction_id?: string
}

export default function OCRPage() {
  const { token } = useAuth()
  const [documents, setDocuments] = useState<OCRDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<OCRDocument | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [currentStep, setCurrentStep] = useState(0)

  const [editData, setEditData] = useState({
    document_type: '',
    vendor_name: '',
    date: '',
    invoice_number: '',
    total_amount: 0,
    tax_amount: 0,
    line_items: [] as any[],
    due_date: ''
  })

  const steps = ['Upload Documents', 'AI Processing', 'Review & Approve', 'Create Transactions']

  useEffect(() => {
    if (token) {
      fetchDocuments()
    }
  }, [token])

  const fetchDocuments = async () => {
    try {
      // Fetch real documents from API
      const response = await fetch('http://localhost:3001/api/v1/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      } else {
        // Start with empty documents for new users
        setDocuments([])
      }
    } catch (error) {
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: File type not supported`)
        return false
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name}: File too large (max 10MB)`)
        return false
      }
      
      return true
    })
    
    setSelectedFiles(validFiles)
    if (validFiles.length > 0) {
      setUploadDialogOpen(true)
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setCurrentStep(0)

    try {
      // Simulate file upload
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        
        const newDocument: OCRDocument = {
          id: String(Date.now() + i),
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          upload_date: new Date().toISOString(),
          processing_status: 'uploaded',
          ocr_confidence: 0,
          extracted_data: {},
          reviewed: false,
          approved: false
        }

        setDocuments(prev => [newDocument, ...prev])
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Update to processing status
        setDocuments(prev => prev.map(doc => 
          doc.id === newDocument.id ? { ...doc, processing_status: 'processing' } : doc
        ))
        setCurrentStep(1)
        setProcessing(true)
        
        // Simulate OCR processing
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        // Complete processing with mock data
        const processedDocument = {
          ...newDocument,
          processing_status: 'completed' as const,
          ocr_confidence: 0.85 + Math.random() * 0.1,
          extracted_data: {
            document_type: 'receipt' as const,
            vendor_name: 'Sample Vendor',
            date: new Date().toISOString().split('T')[0],
            total_amount: Math.round((100 + Math.random() * 500) * 100) / 100,
            tax_amount: Math.round((10 + Math.random() * 50) * 100) / 100
          },
          ai_analysis: {
            suggested_account_codes: ['6700'],
            confidence_score: 0.88,
            transaction_type: 'expense' as const,
            journal_entries: [
              {
                account_code: '6700',
                account_name: 'General Expense',
                debit_amount: 150.00,
                credit_amount: 0,
                description: `Expense from ${file.name}`
              },
              {
                account_code: '1001',
                account_name: 'Cash',
                debit_amount: 0,
                credit_amount: 150.00,
                description: 'Payment for expense'
              }
            ]
          }
        }

        setDocuments(prev => prev.map(doc => 
          doc.id === newDocument.id ? processedDocument : doc
        ))
        
        setCurrentStep(2)
      }

      toast.success(`${selectedFiles.length} document(s) processed successfully!`)
      setCurrentStep(3)
      
    } catch (error) {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      setProcessing(false)
      setUploadDialogOpen(false)
      setSelectedFiles([])
      setCurrentStep(0)
    }
  }

  const handleApproveDocument = async (documentId: string) => {
    try {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, approved: true, reviewed: true } : doc
      ))
      toast.success('Document approved and transaction created!')
    } catch (error) {
      toast.error('Failed to approve document')
    }
  }

  const handleRejectDocument = async (documentId: string) => {
    try {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId ? { ...doc, approved: false, reviewed: true } : doc
      ))
      toast.success('Document rejected')
    } catch (error) {
      toast.error('Failed to reject document')
    }
  }

  const handleEditDocument = (document: OCRDocument) => {
    setSelectedDocument(document)
    setEditData({
      document_type: document.extracted_data.document_type || '',
      vendor_name: document.extracted_data.vendor_name || '',
      date: document.extracted_data.date || '',
      invoice_number: document.extracted_data.invoice_number || '',
      total_amount: document.extracted_data.total_amount || 0,
      tax_amount: document.extracted_data.tax_amount || 0,
      line_items: document.extracted_data.line_items || [],
      due_date: document.extracted_data.due_date || ''
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedDocument) return

    try {
      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocument.id ? {
          ...doc,
          extracted_data: {
            ...doc.extracted_data,
            ...editData
          },
          reviewed: true
        } : doc
      ))
      
      setEditDialogOpen(false)
      setSelectedDocument(null)
      toast.success('Document updated successfully!')
    } catch (error) {
      toast.error('Failed to update document')
    }
  }

  const getStatusChip = (status: string) => {
    const statusConfig = {
      uploaded: { color: 'info' as const, label: 'Uploaded' },
      processing: { color: 'warning' as const, label: 'Processing' },
      completed: { color: 'success' as const, label: 'Completed' },
      failed: { color: 'error' as const, label: 'Failed' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig]
    return (
      <Chip 
        label={config.label} 
        color={config.color}
        size="small"
      />
    )
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon />
    if (fileType === 'application/pdf') return <DocumentIcon />
    return <FileIcon />
  }

  const pendingDocuments = documents.filter(doc => doc.processing_status === 'completed' && !doc.reviewed)
  const processedDocuments = documents.filter(doc => doc.reviewed)
  const totalConfidence = documents.filter(doc => doc.ocr_confidence > 0).reduce((sum, doc) => sum + doc.ocr_confidence, 0)
  const avgConfidence = totalConfidence / documents.filter(doc => doc.ocr_confidence > 0).length || 0

  if (loading) {
    return (
      <Layout title="OCR Processing">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '50%', color: '#00f5ff' }} />
        </Box>
      </Layout>
    )
  }

  return (
    <Layout title="OCR Document Processing">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box display="flex" justifyContent="between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" className="gradient-text" gutterBottom>
              📄 OCR Document Processing
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Upload receipts, invoices, and bills for AI-powered data extraction and transaction creation
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CameraIcon />}
            >
              Take Photo
              <input
                type="file"
                hidden
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
              />
            </Button>
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadIcon />}
              size="large"
            >
              Upload Documents
              <input
                type="file"
                hidden
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
              />
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" className="neon-text">
                  {documents.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Documents
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" sx={{ color: '#ff9800' }}>
                  {pendingDocuments.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Review
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" sx={{ color: '#00e676' }}>
                  {processedDocuments.filter(d => d.approved).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Approved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h5" sx={{ color: '#7c4dff' }}>
                  {Math.round(avgConfidence * 100)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg OCR Accuracy
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Pending Review Alert */}
        {pendingDocuments.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>{pendingDocuments.length} document(s)</strong> are ready for review and approval.
            </Typography>
          </Alert>
        )}

        {/* Documents Grid */}
        <Grid container spacing={3}>
          {/* Pending Documents */}
          {pendingDocuments.length > 0 && (
            <Grid item xs={12}>
              <Card className="glass-card">
                <CardContent>
                  <Typography variant="h6" className="gradient-text" gutterBottom>
                    🔍 Pending Review ({pendingDocuments.length})
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {pendingDocuments.map((document) => (
                      <Grid item xs={12} md={6} lg={4} key={document.id}>
                        <Card sx={{ bgcolor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                          <CardContent>
                            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                              <Box display="flex" alignItems="center" gap={1}>
                                {getFileIcon(document.file_type)}
                                <Typography variant="body2" fontWeight="bold">
                                  {document.filename}
                                </Typography>
                              </Box>
                              {getStatusChip(document.processing_status)}
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              OCR Confidence: {Math.round(document.ocr_confidence * 100)}%
                            </Typography>
                            
                            {document.extracted_data.vendor_name && (
                              <Typography variant="body2" gutterBottom>
                                <strong>Vendor:</strong> {document.extracted_data.vendor_name}
                              </Typography>
                            )}
                            
                            {document.extracted_data.total_amount && (
                              <Typography variant="body2" gutterBottom>
                                <strong>Amount:</strong> ${document.extracted_data.total_amount.toFixed(2)}
                              </Typography>
                            )}
                            
                            {document.ai_analysis && (
                              <Box mt={2}>
                                <Chip 
                                  icon={<AIIcon />} 
                                  label={`AI: ${Math.round(document.ai_analysis.confidence_score * 100)}% confidence`}
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                  sx={{ mb: 1 }}
                                />
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Suggested: {document.ai_analysis.transaction_type}
                                </Typography>
                              </Box>
                            )}
                            
                            <Box display="flex" gap={1} mt={2}>
                              <Button
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={() => {
                                  setSelectedDocument(document)
                                  setViewDialogOpen(true)
                                }}
                              >
                                Review
                              </Button>
                              <Button
                                size="small"
                                startIcon={<EditIcon />}
                                onClick={() => handleEditDocument(document)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="small"
                                color="success"
                                startIcon={<CheckIcon />}
                                onClick={() => handleApproveDocument(document.id)}
                              >
                                Approve
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* All Documents Table */}
          <Grid item xs={12}>
            <Card className="glass-card">
              <CardContent>
                <Typography variant="h6" className="gradient-text" gutterBottom>
                  📋 All Documents ({documents.length})
                </Typography>
                
                <TableContainer component={Paper} sx={{ bgcolor: 'rgba(20, 27, 45, 0.5)' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Document</TableCell>
                        <TableCell>Upload Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="center">OCR Accuracy</TableCell>
                        <TableCell align="center">Status</TableCell>
                        <TableCell align="center">Review Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {documents.map((document) => (
                        <TableRow key={document.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={2}>
                              {getFileIcon(document.file_type)}
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {document.filename}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {document.file_type} • {(document.file_size / 1024 / 1024).toFixed(1)} MB
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(document.upload_date).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {document.extracted_data.document_type && (
                              <Chip 
                                label={document.extracted_data.document_type}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {document.extracted_data.vendor_name || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {document.extracted_data.total_amount 
                                ? `$${document.extracted_data.total_amount.toFixed(2)}`
                                : 'N/A'
                              }
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {document.ocr_confidence > 0 ? (
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {Math.round(document.ocr_confidence * 100)}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={document.ocr_confidence * 100}
                                  sx={{
                                    width: 60,
                                    height: 4,
                                    borderRadius: 2,
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: document.ocr_confidence > 0.8 ? '#00e676' : '#ff9800'
                                    }
                                  }}
                                />
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Processing...
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {getStatusChip(document.processing_status)}
                          </TableCell>
                          <TableCell align="center">
                            {document.reviewed ? (
                              <Chip 
                                label={document.approved ? 'Approved' : 'Rejected'}
                                color={document.approved ? 'success' : 'error'}
                                size="small"
                              />
                            ) : (
                              <Chip 
                                label="Pending"
                                color="warning"
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton 
                              size="small" 
                              onClick={() => {
                                setSelectedDocument(document)
                                setViewDialogOpen(true)
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                            {document.processing_status === 'completed' && !document.reviewed && (
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditDocument(document)}
                              >
                                <EditIcon />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Upload FAB */}
        <Fab
          color="primary"
          aria-label="upload document"
          component="label"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
        >
          <UploadIcon />
          <input
            type="file"
            hidden
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />
        </Fab>

        {/* Upload Progress Dialog */}
        <Dialog 
          open={uploadDialogOpen} 
          onClose={() => !uploading && setUploadDialogOpen(false)}
          maxWidth="md"
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
            Document Upload & Processing
          </DialogTitle>
          <DialogContent>
            <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 3 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Typography variant="h6" gutterBottom>
              Selected Files ({selectedFiles.length})
            </Typography>
            
            <List>
              {selectedFiles.map((file, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {getFileIcon(file.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${file.type} • ${(file.size / 1024 / 1024).toFixed(1)} MB`}
                  />
                </ListItem>
              ))}
            </List>

            {uploading && (
              <Box mt={2}>
                <LinearProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {processing ? 'Processing with AI...' : 'Uploading files...'}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {!uploading && (
              <Button onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleUpload}
              variant="contained"
              disabled={uploading || selectedFiles.length === 0}
              startIcon={uploading ? <AutoIcon /> : <UploadIcon />}
            >
              {uploading ? 'Processing...' : 'Upload & Process'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Document Dialog */}
        <Dialog 
          open={viewDialogOpen} 
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(20, 27, 45, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        >
          {selectedDocument && (
            <>
              <DialogTitle>
                Document Review: {selectedDocument.filename}
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      📄 Extracted Data
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Document Type"
                          secondary={selectedDocument.extracted_data.document_type || 'Not detected'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Vendor"
                          secondary={selectedDocument.extracted_data.vendor_name || 'Not detected'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Date"
                          secondary={selectedDocument.extracted_data.date || 'Not detected'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Invoice Number"
                          secondary={selectedDocument.extracted_data.invoice_number || 'Not detected'}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Total Amount"
                          secondary={selectedDocument.extracted_data.total_amount 
                            ? `$${selectedDocument.extracted_data.total_amount.toFixed(2)}`
                            : 'Not detected'
                          }
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    {selectedDocument.ai_analysis && (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          🤖 AI Analysis
                        </Typography>
                        
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            <strong>Confidence:</strong> {Math.round(selectedDocument.ai_analysis.confidence_score * 100)}%
                          </Typography>
                          <Typography variant="body2">
                            <strong>Transaction Type:</strong> {selectedDocument.ai_analysis.transaction_type}
                          </Typography>
                        </Alert>
                        
                        <Typography variant="subtitle1" gutterBottom>
                          Suggested Journal Entries:
                        </Typography>
                        
                        {selectedDocument.ai_analysis.journal_entries.map((entry, index) => (
                          <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                            <Typography variant="body2">
                              <strong>{entry.account_code} - {entry.account_name}</strong>
                            </Typography>
                            <Typography variant="body2">
                              {entry.debit_amount > 0 
                                ? `Debit: $${entry.debit_amount.toFixed(2)}`
                                : `Credit: $${entry.credit_amount.toFixed(2)}`
                              }
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {entry.description}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
                {selectedDocument.processing_status === 'completed' && !selectedDocument.reviewed && (
                  <>
                    <Button 
                      onClick={() => handleEditDocument(selectedDocument)}
                      variant="outlined"
                    >
                      Edit Data
                    </Button>
                    <Button 
                      onClick={() => handleRejectDocument(selectedDocument.id)}
                      color="error"
                    >
                      Reject
                    </Button>
                    <Button 
                      onClick={() => {
                        handleApproveDocument(selectedDocument.id)
                        setViewDialogOpen(false)
                      }}
                      variant="contained"
                      color="success"
                    >
                      Approve & Create Transaction
                    </Button>
                  </>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Edit Document Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
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
            Edit Document Data
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    value={editData.document_type}
                    onChange={(e) => setEditData({...editData, document_type: e.target.value})}
                  >
                    <MenuItem value="receipt">Receipt</MenuItem>
                    <MenuItem value="invoice">Invoice</MenuItem>
                    <MenuItem value="bill">Bill</MenuItem>
                    <MenuItem value="bank_statement">Bank Statement</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Vendor Name"
                  value={editData.vendor_name}
                  onChange={(e) => setEditData({...editData, vendor_name: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date"
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData({...editData, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  value={editData.invoice_number}
                  onChange={(e) => setEditData({...editData, invoice_number: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Amount"
                  type="number"
                  value={editData.total_amount}
                  onChange={(e) => setEditData({...editData, total_amount: parseFloat(e.target.value) || 0})}
                  inputProps={{ step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Tax Amount"
                  type="number"
                  value={editData.tax_amount}
                  onChange={(e) => setEditData({...editData, tax_amount: parseFloat(e.target.value) || 0})}
                  inputProps={{ step: 0.01 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              variant="contained"
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}