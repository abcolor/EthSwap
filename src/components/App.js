import React, { Component } from 'react'
import Web3 from 'web3'
import Token from '../abis/Token.json'
import EthSwap from '../abis/EthSwap.json'
import Navbar from './Navbar'
import Main from './Main'
import './App.css'

class App extends Component {

  async componentWillMount() {
    console.log('componentWillMount...')
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const web3 = window.web3
    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })
    //console.log(this.state.account)

    const ethBalance = await web3.eth.getBalance(this.state.account)
    this.setState({ ethBalance })
    //console.log(this.state.ethBalance)

    // Load Token
    const abi = Token.abi
    const networkId = await web3.eth.net.getId()
    const tokenData = Token.networks[networkId]
    if(tokenData) {
      const token = new web3.eth.Contract(abi, tokenData.address)
      //console.log(token)
      this.setState({ token })

      let tokenBalance = await token.methods.balanceOf(this.state.account).call()
      //console.log("tokenBalance", tokenBalance.toString())
      this.setState({ tokenBalance: tokenBalance.toString()})
    }
    else {
      window.alert('Token contract not deployed to detected network.')
    }

    // Load EthSwap    
    const ethSwapData = EthSwap.networks[networkId]
    if(ethSwapData) {
      const ethSwap = new web3.eth.Contract(EthSwap.abi, ethSwapData.address)      
      console.log(ethSwap)
      this.setState({ ethSwap })
    }
    else {
      window.alert('EthSwap contract not deployed to detected network.')
    }
    
    this.setState({ loading: false })
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }

    if (window.web3) {
      window.ethereum.on('chainChanged', () => {
        window.location.reload()
      })

      window.ethereum.on('accountsChanged', function (accounts) {
        window.location.reload()
      })
    }
  }

  buyTokens = (etherAmount) => {
    this.setState({ loading: true })
    this.state.ethSwap.methods.buyTokens()
                              .send({ value: etherAmount, from: this.state.account})
                              .on('transactionHash', (hash) => {
                                console.log("buyTokens...transactionHash")                                
                              })
                              .once('confirmation', (confirmationNumber, receipt) => {
                                console.log("buyTokens...confirmation")
                                this.loadBlockchainData()
                                this.setState({ loading: false })
                              })
                              .on('receipt', (receipt) => {
                                // receipt example
                                console.log("buyTokens...receipt", receipt)
                              })
                              .on('error', (error, receipt) => { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
                                console.log("buyTokens...error", error)
                              });                               
  }

  sellTokens = (tokenAmount) => {
    this.setState({ loading: true })

    // get token approvel
    this.state.token.methods.approve(this.state.ethSwap.address, tokenAmount).send({ from: this.state.account })
    .on('transactionHash', (hash) => {
      console.log("approve...transactionHash")
      
    })
    .once('confirmation', (confirmationNumber, receipt) => {
      console.log("approve...confirmation")
      
      // sell token
      this.state.ethSwap.methods.sellTokens(tokenAmount).send({ from: this.state.account })
      .on('transactionHash', (hash) => {
        console.log("sellTokens...transactionHash")
      })
      .once('confirmation', (confirmationNumber, receipt) => {
        console.log("sellTokens...confirmation")
        this.setState({ loading: false })
        this.loadBlockchainData()
      })
      .on('receipt', (receipt) => {
        // receipt example
        console.log("sellTokens...receipt", receipt)
      })
      .on('error', (error, receipt) => { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
        console.log("sellTokens...error", error)
        this.setState({ loading: false })
        window.alert('Fail to sell tokens')
      });          
      
    })
    .on('receipt', (receipt) => {
      // receipt example
      console.log("approve...receipt", receipt)
    })
    .on('error', (error, receipt) => { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
      console.log("approve...error", error)
    });  
  }

  handleCallback = (selectedMode) =>{
    console.log("selectedMode: ", selectedMode)
    this.setState({ currentForm: selectedMode })
  }
  constructor(props) {
    super(props)
    this.state = {
      account: '',
      token: {},
      ethSwap: {},
      ethBalance: '0',
      tokenBalance: '0',
      loading: true,
      currentForm: 'buy'
    }
  }

  render() {
    let content
    if(this.state.loading) {
      content = <p id="loader" className="text-center">Loading...</p>
    }
    else {
      content = <Main 
        ethBalance={this.state.ethBalance} 
        tokenBalance={this.state.tokenBalance}
        buyTokens={this.buyTokens}
        sellTokens={this.sellTokens}
        parentCallback = {this.handleCallback}
        currentForm={this.state.currentForm}
      />
    }

    return (
      <div>
        <Navbar account={ this.state.account }/>
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 ml-auto mr-auto" style={{ maxWidth: '600px' }}>
              <div className="content mr-auto ml-auto">                
                {content}
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
