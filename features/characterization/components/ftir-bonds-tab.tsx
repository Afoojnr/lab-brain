import { listBonds } from '../data/ftir-bonds';
import { FtirBondTable } from './ftir-bond-table';

/** The Bond table tab of the FTIR workspace: the user's table of bonds, with its import. */
export const FtirBondsTab = async () => (
  <FtirBondTable bonds={await listBonds()} />
);
