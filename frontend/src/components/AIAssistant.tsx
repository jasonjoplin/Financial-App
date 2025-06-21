import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  IconButton,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Collapse,
  Card,
  CardContent,
  Button,
  Divider
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Send as SendIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoAwesome as SuggestIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: AgentAction[];
  suggestions?: string[];
}

interface AgentAction {
  tool: string;
  parameters: any;
  description: string;
  result?: any;
  status?: 'pending' | 'completed' | 'error';
  error?: string;
}

interface AIAssistantProps {
  onClose?: () => void;
  initialOpen?: boolean;
}

export default function AIAssistant({ onClose, initialOpen = false }: AIAssistantProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(initialOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, [open]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/ai/chat/suggestions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          conversationHistory
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: data.response.message,
          timestamp: new Date(),
          actions: data.response.actions,
          suggestions: data.response.suggestions
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Show toast for completed actions
        if (data.response.actions?.some((action: AgentAction) => action.status === 'completed')) {
          toast.success('Actions completed successfully!');
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const renderMessage = (message: ChatMessage) => (
    <Box
      key={message.id}
      sx={{
        display: 'flex',
        justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
        mb: 2
      }}
    >
      <Paper
        sx={{
          p: 2,
          maxWidth: '80%',
          bgcolor: message.type === 'user' ? 'primary.main' : 'grey.800',
          color: message.type === 'user' ? 'primary.contrastText' : 'text.primary'
        }}
      >
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Typography>
        
        {/* Render actions if present */}
        {message.actions && message.actions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#00f5ff' }}>
              Actions Performed:
            </Typography>
            {message.actions.map((action, index) => (
              <Card key={index} sx={{ mb: 1, bgcolor: 'rgba(255,255,255,0.05)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {action.status === 'completed' && <CompleteIcon color="success" fontSize="small" />}
                    {action.status === 'error' && <ErrorIcon color="error" fontSize="small" />}
                    {action.status === 'pending' && <CircularProgress size={16} />}
                    <Typography variant="body2">
                      {action.description}
                    </Typography>
                  </Box>
                  {action.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      Error: {action.error}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Render suggestions if present */}
        {message.suggestions && message.suggestions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#00f5ff' }}>
              Suggestions:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {message.suggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  size="small"
                  onClick={() => handleSendMessage(suggestion)}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </Box>
        )}
        
        <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
          {message.timestamp.toLocaleTimeString()}
        </Typography>
      </Paper>
    </Box>
  );

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <Fab
          color="primary"
          aria-label="AI Assistant"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            bgcolor: '#00f5ff',
            '&:hover': {
              bgcolor: '#00bcd4'
            }
          }}
        >
          <AIIcon />
        </Fab>
      )}

      {/* Chat Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            bgcolor: 'rgba(20, 27, 45, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 245, 255, 0.3)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <AIIcon sx={{ color: '#00f5ff' }} />
            <Typography variant="h6" className="gradient-text">
              AI Accounting Assistant
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 0 }}>
          {/* Messages Area */}
          <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
            {messages.length === 0 && (
              <Box textAlign="center" py={4}>
                <AIIcon sx={{ fontSize: 48, color: '#00f5ff', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Welcome to your AI Accounting Assistant!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  I can help you with journal entries, financial reports, invoices, payments, and more.
                  Just ask me what you'd like to do!
                </Typography>
              </Box>
            )}
            
            {messages.map(renderMessage)}
            
            {loading && (
              <Box display="flex" justifyContent="flex-start" mb={2}>
                <Paper sx={{ p: 2, bgcolor: 'grey.800' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">
                      AI Assistant is thinking...
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
            
            <div ref={messagesEndRef} />
          </Box>

          {/* Suggestions */}
          <Collapse in={showSuggestions && messages.length === 0}>
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <SuggestIcon fontSize="small" sx={{ color: '#00f5ff' }} />
                <Typography variant="subtitle2">Try asking me:</Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setShowSuggestions(!showSuggestions)}
                >
                  {showSuggestions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {suggestions.slice(0, 4).map((suggestion, index) => (
                  <Chip
                    key={index}
                    label={suggestion}
                    size="small"
                    onClick={() => handleSendMessage(suggestion)}
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>
          </Collapse>

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Box display="flex" gap={1}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your finances..."
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.05)'
                  }
                }}
              />
              <IconButton
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || loading}
                sx={{
                  bgcolor: '#00f5ff',
                  color: 'black',
                  '&:hover': {
                    bgcolor: '#00bcd4'
                  },
                  '&:disabled': {
                    bgcolor: 'grey.700'
                  }
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}