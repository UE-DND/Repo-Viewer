import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from "@mui/material";
import React from "react";

interface FallbackDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const FallbackDialog: React.FC<FallbackDialogProps> = ({
  open,
  onClose,
  onConfirm
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>使用 API 模式重新搜索？</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          当前索引模式未检索到任何结果，是否改用 API 模式重新搜索？
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onConfirm}>
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
};
