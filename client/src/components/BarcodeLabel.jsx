import React from 'react';
import Barcode from 'react-barcode';

const BarcodeLabel = ({ sampleId, patientName, testName, uhid, date }) => {
    return (
        <div className="barcode-label" style={{
            width: '50mm',
            height: '25mm',
            padding: '2mm',
            border: '1px border #ccc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontFamily: 'monospace'
        }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{patientName.substring(0, 15)}</div>
            <div>{uhid} | {date}</div>
            <div style={{ margin: '2px 0' }}>
                <Barcode
                    value={sampleId}
                    width={1.5}
                    height={30}
                    fontSize={10}
                    displayValue={false}
                    margin={0}
                />
            </div>
            <div style={{ fontWeight: 'bold' }}>{sampleId}</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {testName.substring(0, 20)}
            </div>
        </div>
    );
};

export default BarcodeLabel;
