import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { reportQuestion } from '../api';
import type { Question, ReportType } from '../types';

interface ReportDialogProps {
  question: Question | null;
  token: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'wrong_answer', label: 'Wrong Answer' },
  { value: 'repeated', label: 'Repeated Question' },
  { value: 'unclear', label: 'Unclear Question' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'other', label: 'Other' },
];

export default function ReportDialog({
  question,
  token,
  open,
  onOpenChange,
  onSuccess,
}: ReportDialogProps) {
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!question || !reportType) return;

    setLoading(true);
    setError('');

    try {
      await reportQuestion(question.id, reportType, description, token);
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setReportType('');
        setDescription('');
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReportType('');
      setDescription('');
      setError('');
      setSuccess(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Question</DialogTitle>
          <DialogDescription>
            Help us improve by reporting issues with this question.
          </DialogDescription>
        </DialogHeader>

        {question && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">{question.question_text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Answer: {question.answer}
              </p>
            </div>

            {success ? (
              <div className="text-center py-4">
                <div className="text-green-600 dark:text-green-400 font-semibold">
                  Report submitted successfully!
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Thank you for helping us improve.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="report-type">Issue Type</Label>
                  <Select
                    value={reportType}
                    onValueChange={(value: ReportType) => setReportType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Additional Details (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide more context about the issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
              </>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reportType || loading}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
