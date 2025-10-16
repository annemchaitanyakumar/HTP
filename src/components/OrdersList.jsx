import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

export function OrdersList({ orders }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'PENDING':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Accordion type="single" collapsible key={order.orderId}>
          <AccordionItem value={order.orderId}>
            <AccordionTrigger className="grid grid-cols-4 gap-4 px-4">
              <span>Order #{order.orderId}</span>
              <span>₹{order.totalAmountPaid}</span>
              <span>{formatDate(order.createdTime)}</span>
              <Badge className={getStatusColor(order.paymentStatus)}>
                {order.paymentStatus}
              </Badge>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {JSON.parse(order.productList).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.weight}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.price}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}