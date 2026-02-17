import assert from 'assert';

import startImport from '../../class/wallet-import';
import { WatchOnlyWallet } from '../../class';
import { TWallet } from '../../class/wallets/types';

jest.setTimeout(30 * 1000);

describe('wallet-import: multi-account generic JSON (ColdCard)', () => {
  it('should import bip84 account from ColdCard-style JSON', async () => {
    const coldcardJson = JSON.stringify({
      chain: 'BTC',
      xfp: '0F056943',
      bip84: {
        desc: 'xpub6CQdfC3v9gU86eaSn7AhUFcBVs2nuBo12KtHdLQoXOBN76a4YQoGYt9S8Xvr8srRmJeYWMaIVF73CKQwUH3tWHm3MrcyjJFGiQQFdt1UsfyK',
      },
    });

    const wallets: TWallet[] = [];
    const { promise } = startImport(
      coldcardJson,
      false, // askPassphrase
      false, // searchAccounts
      true,  // offline — avoids network calls
      () => {},
      (w) => wallets.push(w),
      async () => '',
    );

    await promise;

    const watchOnly = wallets.filter(w => w instanceof WatchOnlyWallet);
    assert.ok(watchOnly.length >= 1, `Expected at least 1 WatchOnlyWallet, got ${watchOnly.length}`);
  });

  it('should import multiple accounts from ColdCard JSON', async () => {
    const coldcardJson = JSON.stringify({
      chain: 'BTC',
      xfp: '0F056943',
      bip84: {
        desc: 'xpub6CQdfC3v9gU86eaSn7AhUFcBVs2nuBo12KtHdLQoXOBN76a4YQoGYt9S8Xvr8srRmJeYWMaIVF73CKQwUH3tWHm3MrcyjJFGiQQFdt1UsfyK',
      },
      bip49: {
        desc: 'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYRVVStcFtLm7GFFLDNkLfLgPTo7kz5GMAx1Q3syepkmMXFe5xbmPhKQLXnPGZNoaA8y7nVk',
      },
    });

    const wallets: TWallet[] = [];
    const { promise } = startImport(
      coldcardJson,
      false,
      false,
      true,
      () => {},
      (w) => wallets.push(w),
      async () => '',
    );

    await promise;

    const watchOnly = wallets.filter(w => w instanceof WatchOnlyWallet);
    assert.ok(watchOnly.length >= 2, `Expected at least 2 WatchOnlyWallets, got ${watchOnly.length}`);
  });

  it('should ignore non-BTC chain in generic JSON', async () => {
    const nonBtcJson = JSON.stringify({
      chain: 'LTC',
      xfp: '0F056943',
      bip84: {
        desc: 'xpub6CQdfC3v9gU86eaSn7AhUFcBVs2nuBo12KtHdLQoXOBN76a4YQoGYt9S8Xvr8srRmJeYWMaIVF73CKQwUH3tWHm3MrcyjJFGiQQFdt1UsfyK',
      },
    });

    const wallets: TWallet[] = [];
    const { promise } = startImport(
      nonBtcJson,
      false,
      false,
      true,
      () => {},
      (w) => wallets.push(w),
      async () => '',
    );

    await promise;

    // Non-BTC chain should not produce wallets from the ColdCard import path
    // (may produce wallets from other import paths like watch-only if valid xpub is detected)
    const watchOnlyFromDesc = wallets.filter(
      w => w instanceof WatchOnlyWallet && w.getSecret() === 'xpub6CQdfC3v9gU86eaSn7AhUFcBVs2nuBo12KtHdLQoXOBN76a4YQoGYt9S8Xvr8srRmJeYWMaIVF73CKQwUH3tWHm3MrcyjJFGiQQFdt1UsfyK',
    );
    // The ColdCard path checks json.chain === 'BTC', so LTC should not match that path.
    // However, other paths might still create wallets from the JSON string.
    // The key assertion is that the ColdCard-specific path was NOT taken for non-BTC.
    // Since the JSON string itself is not a valid xpub/address, no wallets from other paths either.
    assert.strictEqual(watchOnlyFromDesc.length, 0, 'Should not import non-BTC chain via ColdCard path');
  });
});
