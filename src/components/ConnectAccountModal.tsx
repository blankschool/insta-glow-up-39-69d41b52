import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Facebook, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConnectAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectAccountModal({ open, onOpenChange }: ConnectAccountModalProps) {
  const { connectWithFacebook } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle');

  const handleConnect = async () => {
    setConnecting(true);
    setStatus('connecting');
    
    try {
      await connectWithFacebook();
      // Note: The page will redirect, so we won't see the success state here
    } catch (error) {
      setStatus('error');
      setConnecting(false);
    }
  };

  const handleClose = () => {
    if (status !== 'connecting') {
      setStatus('idle');
      setConnecting(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar conta</DialogTitle>
          <DialogDescription>
            Conecte sua conta do Instagram via Facebook para acessar as análises.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Erro ao conectar. Tente novamente.</span>
            </div>
          )}

          {/* Facebook Login - connects Instagram via Facebook */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 px-4"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                <Facebook className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="text-left flex-1">
              <p className="font-medium">Continuar com Facebook</p>
              <p className="text-xs text-muted-foreground">
                Conectar conta do Instagram via Facebook
              </p>
            </div>
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Ao conectar, você autoriza o acesso aos dados da sua conta para análise.
            <br />
            Você pode desconectar a qualquer momento.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}