import { useStore } from '../store/useStore';

export function useTransparencyStyle() {
  const componentOpacity = useStore((state) => state.componentOpacity);
  
  // Create styles object that can be applied to elements
  return {
    style: {
      backgroundColor: `rgba(255, 255, 255, ${componentOpacity / 100})`,
    },
    darkStyle: {
      backgroundColor: `rgba(9, 9, 11, ${componentOpacity / 100})`, // zinc-950 equivalent
    },
    // Useful for pseudo-elements or specific cases where we just need the opacity value
    opacity: componentOpacity / 100
  };
}