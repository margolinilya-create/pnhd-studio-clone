import { useEffect, useRef } from "react";

export default function useDebouncedFunction(func: any, delay: number, cleanUp = false) {
    const timeoutRef: any = useRef<any>(undefined);
  
    function clearTimer() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    }
  
    useEffect(() => (cleanUp ? clearTimer : undefined), [cleanUp]);
  
    return (...args: any) => {
      clearTimer();
      timeoutRef.current = setTimeout(() => func(...args), delay);
    };
  }