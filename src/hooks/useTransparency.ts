import { useStore } from '../store/useStore';

export function useTransparencyStyle() {
  const transparency = useStore((state) => state.transparency);
  
  // Create styles object that can be applied to elements
  return {
    style: {
      backgroundColor: `rgba(255, 255, 255, ${transparency / 100})`,
    },
    darkStyle: {
      backgroundColor: `rgba(9, 9, 11, ${transparency / 100})`, // zinc-950 equivalent
    },
    // Useful for pseudo-elements or specific cases where we just need the opacity value
    opacity: transparency / 100
  };
}