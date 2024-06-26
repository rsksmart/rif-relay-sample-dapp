import { useState } from 'react';
import 'src/modals/Transfer.css';
import {
  Modal,
  Col,
  Row,
  TextInput,
  Button,
  Icon,
  Switch,
} from 'react-materialize';
import LoadingButton from 'src/components/LoadingButton';
import { useStore } from 'src/context/context';
import type { Transaction } from 'ethers';
import type {
  RelayEstimation,
  UserDefinedEnvelopingRequest,
  UserDefinedRelayRequest,
} from '@rsksmart/rif-relay-client';
import { addTransaction, checkAddress } from 'src/Utils';

type TransferInfo = {
  fees: string;
  check: boolean;
  address: string;
  amount: string;
};

type TransferInfoKey = keyof TransferInfo;

function Transfer() {
  const { state, dispatch } = useStore();

  const {
    modals,
    account,
    token,
    smartWallet,
    provider,
    chainId,
    relayClient,
  } = state;

  const [transferLoading, setTransferLoading] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);

  const initialState: TransferInfo = {
    check: false,
    fees: '',
    amount: '',
    address: '',
  };

  const [transfer, setTransfer] = useState<TransferInfo>(initialState);

  const close = () => {
    dispatch({ type: 'set_modals', modal: { transfer: false } });
    setTransfer(initialState);
    setEstimateLoading(false);
    setTransferLoading(false);
  };

  const changeValue = <T,>(value: T, prop: TransferInfoKey) => {
    if ((prop === 'fees' || prop === 'amount') && Number(value) < 0) {
      return;
    }
    setTransfer((prev) => ({ ...prev, [prop]: value }));
  };

  const sendRBTC = async () => {
    if (account) {
      setTransferLoading(true);
      try {
        await provider!.getSigner().sendTransaction({
          from: account, // currentSmartWallet.address,
          to: transfer.address,
          value: transfer.amount,
        });
        close();
      } catch (error) {
        const errorObj = error as Error;
        if (errorObj.message) {
          alert(errorObj.message);
        }
        console.error(error);
      }
      setTransferLoading(false);
    }
  };

  const pasteRecipientAddress = async () => {
    const address = await navigator.clipboard.readText();
    if (checkAddress(address.toLowerCase())) {
      changeValue(address, 'address');
    } else {
      alert('Invalid address');
    }
  };

  const transferSmartWalletButtonClick = async () => {
    setTransferLoading(true);
    try {
      const tokenAmount = transfer.fees === '' ? '0' : transfer.fees;

      const encodedAbi = token!.instance.interface.encodeFunctionData(
        'transfer',
        [transfer.address, transfer.amount]
      );

      const relayTransactionOpts: UserDefinedRelayRequest = {
        request: {
          from: account,
          data: encodedAbi,
          to: token!.instance.address,
          tokenAmount,
          tokenContract: token!.instance.address,
        },
        relayData: {
          callForwarder: smartWallet!.address,
        },
      };

      const transaction: Transaction = await relayClient!.relayTransaction(
        relayTransactionOpts
      );

      addTransaction(smartWallet!.address, chainId, {
        date: new Date(),
        id: transaction.hash!,
        type: `Transfer ${transfer.check ? 'RBTC' : token!.symbol}`,
      });
      dispatch({ type: 'reload', reload: true });
      close();
    } catch (error) {
      const errorObj = error as Error;
      if (errorObj.message) {
        alert(errorObj.message);
      }
      console.error(error);
    }
    setTransferLoading(false);
  };

  const handleEstimateTransferButtonClick = async () => {
    if (account) {
      setEstimateLoading(true);
      try {
        const encodedAbi = token!.instance.interface.encodeFunctionData(
          'transfer',
          [transfer.address, transfer.amount]
        );

        const relayTransactionOpts: UserDefinedEnvelopingRequest = {
          request: {
            from: account,
            data: encodedAbi,
            to: token!.instance.address,
            tokenContract: token!.instance.address,
          },
          relayData: {
            callForwarder: smartWallet!.address,
          },
        };

        const estimation: RelayEstimation =
          await relayClient!.estimateRelayTransaction(relayTransactionOpts);

        if (transfer.check === true) {
          changeValue(estimation.requiredNativeAmount, 'fees');
        } else {
          changeValue(estimation.requiredTokenAmount, 'fees');
        }
      } catch (error) {
        const errorObj = error as Error;
        if (errorObj.message) {
          alert(errorObj.message);
        }
        console.error(error);
      }
      setEstimateLoading(false);
    }
  };

  const handleTransferSmartWalletButtonClick = async () => {
    if (transfer.check) {
      await sendRBTC();
    } else {
      await transferSmartWalletButtonClick();
    }
  };

  const returnActions = () => [
    <Button
      flat
      node='button'
      waves='green'
      onClick={handleTransferSmartWalletButtonClick}
      disabled={transferLoading}
      className='transfer-btn-transfer'
    >
      Transfer
      <LoadingButton show={transferLoading} />
    </Button>,
    <Button
      flat
      node='button'
      waves='green'
      onClick={handleEstimateTransferButtonClick}
      disabled={estimateLoading}
      className='transfer-btn-estimate'
    >
      Estimate
      <LoadingButton show={estimateLoading} />
    </Button>,
    <Button
      flat
      modal='close'
      node='button'
      waves='green'
      className='transfer-btn-cancel'
    >
      Cancel
    </Button>,
  ];

  return (
    <Modal
      open={modals.transfer}
      options={{
        onCloseEnd: () => close(),
      }}
      actions={returnActions()}
    >
      <Row>
        <form>
          <Col s={8}>
            <TextInput
              label='Transfer to'
              placeholder='Address'
              value={transfer.address}
              validate
              onChange={(event) => {
                changeValue(event.currentTarget.value, 'address');
              }}
              id='transfer-input-to'
            />
          </Col>
          <Col s={1}>
            <Button
              onClick={pasteRecipientAddress}
              waves='light'
              className='indigo accent-2 transfer-btn-paste'
              tooltip='Paste'
              node='div'
            >
              <Icon center>content_paste</Icon>
            </Button>
          </Col>
          <Col s={8}>
            <TextInput
              label='Amount'
              placeholder={`0  ${transfer.check ? 'RBTC' : token!.symbol}`}
              value={transfer.amount}
              type='number'
              validate
              onChange={(event) => {
                changeValue(event.currentTarget.value, 'amount');
              }}
              id='transfer-input-amount'
            />
          </Col>
          <Col s={4}>
            <Switch
              offLabel={token!.symbol!}
              onLabel='RBTC'
              checked={transfer.check}
              onChange={(event) => {
                changeValue(event.currentTarget.checked, 'check');
              }}
              id='transfer-switch-rbtc'
            />
          </Col>
          <Col s={10}>
            <TextInput
              label='Fees'
              placeholder={`0 ${token!.symbol}`}
              value={transfer.fees}
              type='number'
              validate
              onChange={(event) => {
                changeValue(event.currentTarget.value, 'fees');
              }}
              id='transfer-input-fee'
            />
          </Col>
        </form>
      </Row>
    </Modal>
  );
}

export default Transfer;
