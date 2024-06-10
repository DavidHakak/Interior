import { useMediaQuery } from 'react-responsive';

const mobileBreakPoint = 1020;

export function useDevice() {
    const isMobile = useMediaQuery({ maxWidth: mobileBreakPoint })
    const isDesktop = useMediaQuery({ minWidth: mobileBreakPoint + 1 })
    return {
        isMobile,
        isDesktop
    };
}