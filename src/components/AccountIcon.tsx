import type { Account } from "../api";
import { ServiceIcon } from "./ServiceIcon";
export function AccountIcon({ account }: { account: Account }) {
  return account.details.image ? (
    <img className="custom-account-image" src={account.details.image} alt="" />
  ) : (
    <ServiceIcon serviceId={account.serviceId} />
  );
}
