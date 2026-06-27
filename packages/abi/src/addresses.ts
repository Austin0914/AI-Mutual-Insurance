// 由 scripts/gen-addresses.ts 從 deployments/*.json 產生，請勿手改。
export const addresses: Record<number, Partial<Record<string, `0x${string}`>>> = {
  "31337": {
    "AssessorRegistry": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "DisputeManager": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "FundVault": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "MockERC20": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "Randomness": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  },
  "11155111": {
    "AssessorRegistry": "0x19DAB1535A82B0F40c368dAB597F7376179cD788",
    "DisputeManager": "0x106c2FA544e1620C1c1642a75A0b10D0C9766501",
    "FundVault": "0xBe28af4A98B2D6f0fb37c3AcD39c71C0F66692aD",
    "MockERC20": "0x72eA513DBC998dEBD77EA1FDEd35EFB9440f4515",
    "Randomness": "0x27B084Db3f9e5c0bbF56929C28c5C426D60Cd642"
  }
}
