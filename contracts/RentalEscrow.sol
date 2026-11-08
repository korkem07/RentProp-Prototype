// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract RentalEscrow {

    enum State {
        Created,
        Confirmed,
        Funded,
        Proposed,
        Disputed,
        Settled
    }

    struct Agreement {
        address landlord;
        address tenant;
        address reviewer;

        uint256 depositAmount;
        uint256 landlordAmount;
        uint256 tenantAmount;

        State state;
        bool exists;
    }

    uint256 public nextAgreementId;

    mapping(uint256 => Agreement) public agreements;

    event AgreementCreated(
        uint256 indexed id,
        address landlord,
        address tenant,
        uint256 depositAmount
    );

    event AgreementConfirmed(uint256 indexed id);

    event DepositRecorded(
        uint256 indexed id,
        uint256 amount
    );

    event SettlementProposed(
        uint256 indexed id,
        uint256 landlordAmount,
        uint256 tenantAmount
    );

    event SettlementDisputed(uint256 indexed id);

    event SettlementCompleted(
        uint256 indexed id,
        uint256 landlordAmount,
        uint256 tenantAmount
    );

    modifier agreementExists(uint256 id) {
        require(
            agreements[id].exists,
            "Agreement does not exist"
        );
        _;
    }

    modifier onlyLandlord(uint256 id) {
        require(
            msg.sender == agreements[id].landlord,
            "Only landlord"
        );
        _;
    }

    modifier onlyTenant(uint256 id) {
        require(
            msg.sender == agreements[id].tenant,
            "Only tenant"
        );
        _;
    }

    modifier onlyReviewer(uint256 id) {
        require(
            msg.sender == agreements[id].reviewer,
            "Only reviewer"
        );
        _;
    }

    function createAgreement(
        address tenant,
        address reviewer,
        uint256 depositAmount
    ) external returns (uint256) {

        require(
            tenant != address(0),
            "Invalid tenant"
        );

        require(
            reviewer != address(0),
            "Invalid reviewer"
        );

        require(
            depositAmount > 0,
            "Deposit must be positive"
        );

        uint256 id = nextAgreementId++;

        agreements[id] = Agreement({
            landlord: msg.sender,
            tenant: tenant,
            reviewer: reviewer,
            depositAmount: depositAmount,
            landlordAmount: 0,
            tenantAmount: 0,
            state: State.Created,
            exists: true
        });

        emit AgreementCreated(
            id,
            msg.sender,
            tenant,
            depositAmount
        );

        return id;
    }

    function confirmAgreement(uint256 id)
        external
        agreementExists(id)
        onlyTenant(id)
    {
        require(
            agreements[id].state == State.Created,
            "Wrong state"
        );

        agreements[id].state = State.Confirmed;

        emit AgreementConfirmed(id);
    }

    function depositTestFunds(uint256 id)
        external
        agreementExists(id)
        onlyTenant(id)
    {
        require(
            agreements[id].state == State.Confirmed,
            "Agreement not confirmed"
        );

        agreements[id].state = State.Funded;

        emit DepositRecorded(
            id,
            agreements[id].depositAmount
        );
    }

    function proposeSettlement(
        uint256 id,
        uint256 landlordAmount,
        uint256 tenantAmount
    )
        external
        agreementExists(id)
        onlyLandlord(id)
    {
        Agreement storage agreement = agreements[id];

        require(
            agreement.state == State.Funded,
            "Deposit not funded"
        );

        require(
            landlordAmount + tenantAmount ==
                agreement.depositAmount,
            "Allocation must equal deposit"
        );

        agreement.landlordAmount = landlordAmount;
        agreement.tenantAmount = tenantAmount;
        agreement.state = State.Proposed;

        emit SettlementProposed(
            id,
            landlordAmount,
            tenantAmount
        );
    }

    function approveSettlement(uint256 id)
        external
        agreementExists(id)
        onlyTenant(id)
    {
        require(
            agreements[id].state == State.Proposed,
            "No settlement proposal"
        );

        agreements[id].state = State.Settled;

        emit SettlementCompleted(
            id,
            agreements[id].landlordAmount,
            agreements[id].tenantAmount
        );
    }

    function disputeSettlement(uint256 id)
        external
        agreementExists(id)
        onlyTenant(id)
    {
        require(
            agreements[id].state == State.Proposed,
            "No settlement proposal"
        );

        agreements[id].state = State.Disputed;

        emit SettlementDisputed(id);
    }

    function resolveDispute(
        uint256 id,
        uint256 landlordAmount,
        uint256 tenantAmount
    )
        external
        agreementExists(id)
        onlyReviewer(id)
    {
        Agreement storage agreement = agreements[id];

        require(
            agreement.state == State.Disputed,
            "Agreement is not disputed"
        );

        require(
            landlordAmount + tenantAmount ==
                agreement.depositAmount,
            "Allocation must equal deposit"
        );

        agreement.landlordAmount = landlordAmount;
        agreement.tenantAmount = tenantAmount;

        agreement.state = State.Settled;

        emit SettlementCompleted(
            id,
            landlordAmount,
            tenantAmount
        );
    }
}