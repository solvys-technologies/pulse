import type { Appearance } from '@clerk/types';

export const pulseAppearance: Appearance = {
  variables: {
    colorPrimary: '#EAB308',
    colorText: '#ffffff',
    colorBackground: 'transparent',
    colorInputBackground: 'rgba(0, 0, 0, 0.6)',
    colorInputText: '#f4f4f5',
    borderRadius: '9999px',
    fontSize: '16px',
  },
  elements: {
    rootBox: 'w-full',
    card: 'bg-transparent shadow-none',
    headerTitle: 'text-yellow-200 tracking-[0.3em] uppercase text-xs',
    headerSubtitle: 'text-zinc-400',
    formFieldLabel: 'text-zinc-200 tracking-[0.2em]',
    formFieldInput:
      'bg-black/60 border border-yellow-500/20 text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-500/60',
    formFieldInputShowPasswordButton: 'text-yellow-500 hover:text-yellow-300',
    dividerLine: 'bg-yellow-500/20',
    dividerText: 'text-yellow-500/70 uppercase tracking-[0.2em]',
    socialButtonsBlockButton:
      'bg-black/70 border border-yellow-500/30 text-yellow-100 hover:bg-yellow-500/10 transition-all duration-500',
    formButtonPrimary:
      'bg-black border-2 border-yellow-500 text-yellow-500 font-bold tracking-[0.25em] uppercase ' +
      'hover:bg-yellow-500 hover:text-black hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transition-all duration-700',
    footerActionLink: 'text-yellow-500 hover:text-yellow-300',
    formFieldAction__password: 'text-yellow-500 hover:text-yellow-300',
    identityPreviewEditButton: 'text-yellow-400 hover:text-yellow-200',
    footer: 'text-zinc-500 text-xs tracking-[0.2em]',
  },
};
