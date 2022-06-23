import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { RelayingServices } from '@rsksmart/rif-relay-sdk';
import { Select } from 'react-materialize';

type AllowedTokensProps = {
    provider: RelayingServices;
    setToken: Dispatch<SetStateAction<string>>;
};

function AllowedTokens(props: AllowedTokensProps) {
    const { provider, setToken } = props;

    const [allowedTokens, setAllowedTokens] = useState<Array<string>>([]);

    const reload = async () => {
        const tokens = await provider.getAllowedTokens();
        if (tokens.length > 0) {
            setAllowedTokens(tokens);
            setToken(tokens[0]);
        } else {
            alert('Not allowed tokens');
        }
    };

    useEffect(() => {
        reload();
    }, []);

    const handleChange = (event: any) => {
        setToken(event.target.value);
    };

    return (
        <Select onChange={handleChange}>
            {allowedTokens.map((value) => (
                <option value={value} key={value}>
                    {value}
                </option>
            ))}
        </Select>
    );
}

export default AllowedTokens;