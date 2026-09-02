import { useQuery } from '@tanstack/react-query';
import { obterHealth } from '../services/health.js';

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: obterHealth });
}
