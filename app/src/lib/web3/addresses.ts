import { isAddress, zeroAddress, type Address } from "viem";

function configuredAddress(value: string | undefined): Address {
  return value && isAddress(value) ? (value as Address) : zeroAddress;
}

export const REGISTRY_ADDRESS = configuredAddress(process.env.NEXT_PUBLIC_REGISTRY_ADDRESS);
export const GUARD_ADDRESS = configuredAddress(process.env.NEXT_PUBLIC_GUARD_ADDRESS);
export const TUSD8_ADDRESS = configuredAddress(process.env.NEXT_PUBLIC_TUSD8_ADDRESS);
export const contractsConfigured =
  REGISTRY_ADDRESS !== zeroAddress && GUARD_ADDRESS !== zeroAddress;
