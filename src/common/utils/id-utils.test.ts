import { describe, it, expect } from 'vitest';
import { IDUtils } from './id-utils.js';

describe('IDUtils', () => {
  describe('isValidTicketId', () => {
    it('should accept local format IDs', () => {
      expect(IDUtils.isValidTicketId('0001')).toBe(true);
      expect(IDUtils.isValidTicketId('0042')).toBe(true);
      expect(IDUtils.isValidTicketId('1234')).toBe(true);
      expect(IDUtils.isValidTicketId('9999')).toBe(true);
    });

    it('should accept GitHub format IDs', () => {
      expect(IDUtils.isValidTicketId('#1')).toBe(true);
      expect(IDUtils.isValidTicketId('#42')).toBe(true);
      expect(IDUtils.isValidTicketId('#123')).toBe(true);
      expect(IDUtils.isValidTicketId('#9999')).toBe(true);
      expect(IDUtils.isValidTicketId('70')).toBe(true); // Without #
      expect(IDUtils.isValidTicketId('123')).toBe(true); // Without #
    });

    it('should reject invalid formats', () => {
      expect(IDUtils.isValidTicketId('')).toBe(false);
      expect(IDUtils.isValidTicketId('abc')).toBe(false);
      expect(IDUtils.isValidTicketId('00001')).toBe(false); // Too many digits
      expect(IDUtils.isValidTicketId('#')).toBe(false);
      expect(IDUtils.isValidTicketId('##123')).toBe(false);
      expect(IDUtils.isValidTicketId('#0')).toBe(false); // GitHub issues start from 1
    });
  });

  describe('normalizeTicketId', () => {
    it('should normalize local format IDs', () => {
      expect(IDUtils.normalizeTicketId('0001')).toBe('0001');
      expect(IDUtils.normalizeTicketId('0042')).toBe('0042');
    });

    it('should normalize GitHub format IDs', () => {
      expect(IDUtils.normalizeTicketId('#70')).toBe('70');
      expect(IDUtils.normalizeTicketId('#123')).toBe('123');
      expect(IDUtils.normalizeTicketId('70')).toBe('70');
      expect(IDUtils.normalizeTicketId('123')).toBe('123');
    });
  });

  describe('getIdFormat', () => {
    it('should detect local format', () => {
      expect(IDUtils.getIdFormat('0001')).toBe('local');
      expect(IDUtils.getIdFormat('0042')).toBe('local');
      expect(IDUtils.getIdFormat('1234')).toBe('local');
    });

    it('should detect GitHub format', () => {
      expect(IDUtils.getIdFormat('#1')).toBe('github');
      expect(IDUtils.getIdFormat('#123')).toBe('github');
      expect(IDUtils.getIdFormat('70')).toBe('github');
      expect(IDUtils.getIdFormat('123')).toBe('github');
    });

    it('should return null for invalid format', () => {
      expect(IDUtils.getIdFormat('')).toBe(null);
      expect(IDUtils.getIdFormat('abc')).toBe(null);
      expect(IDUtils.getIdFormat('00001')).toBe(null);
    });
  });
});