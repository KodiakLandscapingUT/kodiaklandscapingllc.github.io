import { Box, Card, CardContent, Typography } from '@mui/material';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <Box sx={{ minHeight: '100vh', width: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ width: 1, maxWidth: 400, mx: 2 }}>
        <CardContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', mb: 2, gap: 1, alignItems: 'center' }}>
            <AlertCircle size={32} color="#f44336" />
            <Typography variant="h6" component="h1" sx={{ fontWeight: 'bold' }} color="text.primary">
              404 Page Not Found
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Did you forget to add the page to the router?
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
