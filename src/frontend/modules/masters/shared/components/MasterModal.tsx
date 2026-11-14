import React from 'react';
import { Modal } from '../../../../components/Modal';

interface MasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const MasterModal: React.FC<MasterModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'sm',
  children
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      {children}
    </Modal>
  );
};
